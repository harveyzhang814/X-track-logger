// X推文追踪器 - Content Script
(function() {
  'use strict';
  
  // 检查Chrome扩展API是否可用
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('[X推文追踪器] Chrome扩展API不可用，请确保扩展已正确安装');
    return;
  }

  // 存储已处理的推文ID，避免重复添加按钮
  const processedTweets = new Set();
  
  // 保存按钮的类名
  const SAVE_BUTTON_CLASS = 'x-tracker-save-btn';
  const SAVED_BUTTON_CLASS = 'x-tracker-saved-btn';
  const FOCUS_HIGHLIGHT_UNSAVED = 'x-tracker-tweet-focus-unsaved';
  const FOCUS_HIGHLIGHT_SAVED = 'x-tracker-tweet-focus-saved';

  // 当前焦点推文（用于边框高亮）
  let currentFocusTweet = null;

  // 保存焦点推文快捷键配置（从 storage 读取，无则用默认）
  const SHORTCUT_STORAGE_KEY = 'xTrackerSaveFocusedShortcut';
  const DEFAULT_SHORTCUT = { key: 'S', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };
  let saveFocusedShortcut = { ...DEFAULT_SHORTCUT };

  // 移除焦点已保存记录快捷键配置
  const UNSAVE_SHORTCUT_STORAGE_KEY = 'xTrackerUnsaveFocusedShortcut';
  const DEFAULT_UNSAVE_SHORTCUT = { key: 'D', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };
  let unsaveFocusedShortcut = { ...DEFAULT_UNSAVE_SHORTCUT };

  // 重新判断焦点推文类型快捷键配置
  const REDETECT_TYPE_STORAGE_KEY = 'xTrackerRedetectTypeShortcut';
  const DEFAULT_REDETECT_SHORTCUT = { key: 'T', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };
  let redetectTypeShortcut = { ...DEFAULT_REDETECT_SHORTCUT };

  // 类型识别与按钮逻辑见 docs/逻辑说明.md
  const DEBUG_TYPE_DETECTION = false; // 设为 true 时在控制台输出判定信号，便于排查

  // 提取推文信息的函数
  function extractTweetInfo(tweetElement) {
    try {
      // 获取推文文本
      const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
      const text = textElement ? textElement.innerText : '';

      // 获取作者信息
      const authorElement = tweetElement.querySelector('[data-testid="User-Name"]');
      const authorName = authorElement ? authorElement.innerText.split('\n')[0] : '';
      const authorHandle = authorElement ? authorElement.innerText.split('\n')[1]?.replace('@', '') : '';

      // 获取时间戳
      const timeElement = tweetElement.querySelector('time');
      const dateTime = timeElement ? timeElement.getAttribute('datetime') : '';
      const dateText = timeElement ? timeElement.innerText : '';

      // 获取推文链接
      const linkElement = tweetElement.querySelector('a[href*="/status/"]');
      const tweetLink = linkElement ? linkElement.href : '';
      const tweetId = tweetLink.match(/\/status\/(\d+)/)?.[1] || '';

      // 类型判定：顺序 1.Quote 2.Repost 3.Reply 4.Tweet（见 docs/逻辑说明.md）
      let tweetType = 'tweet';
      let quotedTweet = null;
      const signals = {}; // 用于可选调试输出

      // --- 步骤 1：Quote（引用推文 / 转评）---
      // 主判据：data-testid="quoteTweet"；备选1：当前 article 内的嵌套 article；备选2：同条内存在第二组 User-Name + tweetText（引用卡片）
      const socialContext = tweetElement.querySelector('[data-testid="socialContext"]');
      const socialContextText = socialContext ? (socialContext.innerText || socialContext.textContent || '') : '';
      const isRepostContext = /转推|Reposted|转推了|reposted|Retweeted/i.test(socialContextText);
      signals.socialContextRepost = !!socialContext && isRepostContext;

      let quoteElement = tweetElement.querySelector('[data-testid="quoteTweet"]');
      if (!quoteElement && !isRepostContext) {
        // 备选1：嵌套的 article（内嵌推文块，用 contains 判断在当前推文内即可）
        const nestedArticles = tweetElement.querySelectorAll('article[data-testid="tweet"]');
        for (const nestedArticle of nestedArticles) {
          if (nestedArticle !== tweetElement && tweetElement.contains(nestedArticle)) {
            quoteElement = nestedArticle;
            break;
          }
        }
      }
      if (!quoteElement && !isRepostContext) {
        // 备选2：同一条推文内存在第二组「作者 + 正文」（引用卡片常见结构，X 可能不用 quoteTweet 或嵌套 article）
        const allTweetTexts = tweetElement.querySelectorAll('[data-testid="tweetText"]');
        if (allTweetTexts.length >= 2) {
          const secondTweetText = allTweetTexts[1];
          const container = secondTweetText.closest('div[role="link"]') || secondTweetText.closest('article') || secondTweetText.parentElement;
          if (container && tweetElement.contains(container) && container !== tweetElement) {
            quoteElement = container;
          }
        }
      }
      signals.quoteTweet = !!quoteElement;

      if (quoteElement) {
        tweetType = 'quote';
        const quotedTextElement = quoteElement.querySelector('[data-testid="tweetText"]');
        const quotedAuthorElement = quoteElement.querySelector('[data-testid="User-Name"]');
        let quotedLink = '';
        let quotedLinkElement = null;
        const allLinks = quoteElement.querySelectorAll('a[href*="/status/"]');
        for (const link of allLinks) {
          const href = link.getAttribute('href') || link.href || '';
          if (href && href.includes('/status/')) {
            const linkId = href.match(/\/status\/(\d+)/)?.[1];
            if (linkId && linkId !== tweetId) {
              quotedLinkElement = link;
              break;
            }
          }
        }
        if (!quotedLinkElement) {
          const quoteContainer = quoteElement.closest('div[role="link"]') || quoteElement.parentElement;
          if (quoteContainer) {
            const containerLinks = quoteContainer.querySelectorAll('a[href*="/status/"]');
            for (const link of containerLinks) {
              const href = link.getAttribute('href') || link.href || '';
              const linkId = href.match(/\/status\/(\d+)/)?.[1];
              if (linkId && linkId !== tweetId) {
                quotedLinkElement = link;
                break;
              }
            }
          }
        }
        if (quotedLinkElement) {
          quotedLink = quotedLinkElement.href || quotedLinkElement.getAttribute('href') || '';
          if (quotedLink && !quotedLink.startsWith('http')) {
            quotedLink = quotedLink.startsWith('/') ? `https://x.com${quotedLink}` : `https://x.com/${quotedLink}`;
          }
        }
        quotedTweet = {
          text: quotedTextElement ? quotedTextElement.innerText : '',
          author: {
            name: quotedAuthorElement ? quotedAuthorElement.innerText.split('\n')[0] : '',
            handle: quotedAuthorElement ? quotedAuthorElement.innerText.split('\n')[1]?.replace('@', '') : ''
          },
          link: quotedLink
        };
      }

      // --- 步骤 2：Repost（转推）---
      if (tweetType === 'tweet' && signals.socialContextRepost) {
        tweetType = 'repost';
      }

      // --- 步骤 3：Reply（回复）---
      if (tweetType === 'tweet') {
        let replyIndicator = false;
        // 只匹配「回复给 @xxx」/「Replying to」等回复语境，不匹配操作栏的「回复」/「Reply」按钮（每条都有）
        const cardText = (tweetElement.innerText || tweetElement.textContent || '').trim();
        if (/Replying\s+to|回复给/i.test(cardText)) {
          replyIndicator = true;
        }
        if (!replyIndicator) {
          const replyIndicators = tweetElement.querySelectorAll('span[dir="ltr"], span, a, div');
          for (const indicator of replyIndicators) {
            const indicatorText = (indicator.textContent || '').trim();
            if (indicatorText === 'Replying to' || indicatorText.includes('Replying to') || indicatorText.includes('回复给')) {
              replyIndicator = true;
              break;
            }
          }
        }
        signals.replyIndicator = replyIndicator;
        const statusMatches = tweetLink ? tweetLink.match(/\/status\/(\d+)/g) : null;
        signals.linkStatusCount = statusMatches ? statusMatches.length : 0;
        const trimmedText = text.trim();
        const textStartsWithAt = trimmedText && /^@\w+\s+/.test(trimmedText);
        signals.textStartsWithAt = textStartsWithAt;

        // 结构判断：仅当容器内为 2～4 条顶层推文且当前非首条时视为串推/对话（避免把整页时间线当一串）
        let isReplyByStructure = false;
        let el = tweetElement.parentElement;
        let depth = 0;
        const maxDepth = 25;
        while (el && depth < maxDepth) {
          const allArticles = el.querySelectorAll('article[data-testid="tweet"]');
          const rootArticles = Array.from(allArticles).filter(function(a) {
            return !Array.from(allArticles).some(function(b) { return b !== a && b.contains(a); });
          });
          if (rootArticles.length >= 2 && rootArticles.length <= 4) {
            if (rootArticles[0] !== tweetElement && rootArticles.indexOf(tweetElement) !== -1) {
              isReplyByStructure = true;
            }
            break;
          }
          el = el.parentElement;
          depth++;
        }
        signals.replyByStructure = isReplyByStructure;

        if (replyIndicator || (signals.linkStatusCount > 1) || textStartsWithAt || isReplyByStructure) {
          tweetType = 'reply';
        }
      }

      if (DEBUG_TYPE_DETECTION && tweetId) {
        console.log('[X推文追踪器] type=', tweetType, ', signals:', JSON.stringify(signals));
      }

      // 获取转推的原始作者（如果是repost）
      let originalAuthor = '';
      if (tweetType === 'repost') {
        const originalAuthorElement = tweetElement.querySelector('[data-testid="tweet"] [data-testid="User-Name"]');
        originalAuthor = originalAuthorElement ? originalAuthorElement.innerText.split('\n')[0] : '';
      }

      // 获取媒体信息（图片、视频等）
      const mediaElements = tweetElement.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="videoComponent"]');
      const hasMedia = mediaElements.length > 0;

      return {
        id: tweetId || Date.now().toString(),
        text: text,
        author: {
          name: authorName,
          handle: authorHandle
        },
        date: dateTime || new Date().toISOString(),
        dateText: dateText,
        link: tweetLink,
        type: tweetType,
        originalAuthor: originalAuthor,
        quotedTweet: quotedTweet,
        hasMedia: hasMedia,
        savedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('提取推文信息时出错:', error);
      return null;
    }
  }

  // 保存图标（磁盘样式）
  const SAVE_ICON_PATH = 'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6 6h9v4H6z';

  // 推文类型在按钮上的显示文案（英文：Tweet / Reply / Repost / Quote）
  const TYPE_LABELS = {
    tweet: 'Tweet',
    reply: 'Reply',
    repost: 'Repost',
    quote: 'Quote'
  };

  // 创建保存按钮 - 磁盘图标 + 类型文案
  function createSaveButton(typeLabel) {
    const label = typeLabel || 'Tweet';
    const button = document.createElement('button');
    button.className = SAVE_BUTTON_CLASS;
    button.type = 'button'; // 防止表单提交
    button.setAttribute('aria-label', '保存推文');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="${SAVE_ICON_PATH}"/>
      </svg>
      <span class="x-tracker-btn-type">${label}</span>
    `;
    return button;
  }

  // 创建已保存按钮 - 磁盘图标 + 类型文案
  function createSavedButton(typeLabel) {
    const label = typeLabel || 'Tweet';
    const button = document.createElement('button');
    button.className = SAVED_BUTTON_CLASS;
    button.type = 'button'; // 防止表单提交
    button.setAttribute('aria-label', '已保存推文');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="${SAVE_ICON_PATH}"/>
      </svg>
      <span class="x-tracker-btn-type">${label}</span>
    `;
    return button;
  }


  // 通过 background script 检查推文是否已保存
  async function isTweetSaved(tweetId) {
    try {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'isTweetSaved', tweetId },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('检查推文保存状态时出错:', chrome.runtime.lastError);
              resolve(false);
            } else {
              resolve(response?.isSaved || false);
            }
          }
        );
      });
    } catch (error) {
      console.error('检查推文保存状态时出错:', error);
      return false;
    }
  }

  // 通过 background script 保存推文
  async function saveTweet(tweetInfo) {
    try {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'saveTweet', tweetInfo },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('保存推文时出错:', chrome.runtime.lastError);
              resolve(false);
            } else {
              const success = response?.success || false;
              if (success) {
                console.log('[X推文追踪器] 推文已保存:', tweetInfo.id);
                // 发送通知消息
                chrome.runtime.sendMessage({
                  action: 'tweetSaved',
                  tweetId: tweetInfo.id
                }).catch(() => {});
              }
              resolve(success);
            }
          }
        );
      });
    } catch (error) {
      console.error('保存推文时出错:', error);
      return false;
    }
  }

  // 通过 background script 删除保存的推文
  async function unsaveTweet(tweetId) {
    try {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'deleteTweet', tweetId },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('删除保存的推文时出错:', chrome.runtime.lastError);
              resolve(false);
            } else {
              resolve(response?.success || false);
            }
          }
        );
      });
    } catch (error) {
      console.error('删除保存的推文时出错:', error);
      return false;
    }
  }

  // 等待操作栏加载完成
  async function waitForActionBar(tweetElement, maxWait = 3000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      // 尝试查找操作栏
      let actionBar = tweetElement.querySelector('[role="group"]');
      
      if (!actionBar) {
        const replyButton = tweetElement.querySelector('[data-testid="reply"]');
        if (replyButton) {
          actionBar = replyButton.closest('div[role="group"]');
        }
      }
      
      if (!actionBar) {
        const actionButtons = tweetElement.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
        if (actionButtons.length >= 2) {
          const firstButton = actionButtons[0];
          actionBar = firstButton.closest('div[role="group"]') || firstButton.parentElement;
        }
      }
      
      // 如果找到操作栏，检查是否包含至少2个操作按钮（确保操作栏已完全加载）
      if (actionBar) {
        const buttons = actionBar.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="bookmark"], [data-testid="share"]');
        if (buttons.length >= 2) {
          return actionBar;
        }
      }
      
      // 等待100ms后重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  // 为推文添加保存按钮
  async function addSaveButtonToTweet(tweetElement, retryCount = 0) {
    try {
      // 首先检查整个推文元素中是否已经有保存按钮（最优先检查）
      // 如果按钮已存在，标记为已处理并返回
      const existingButton = tweetElement.querySelector(`.${SAVE_BUTTON_CLASS}, .${SAVED_BUTTON_CLASS}`);
      if (existingButton) {
        // 如果按钮已存在，获取推文ID并标记为已处理
        const linkElement = tweetElement.querySelector('a[href*="/status/"]');
        if (linkElement) {
          const tweetId = linkElement.href.match(/\/status\/(\d+)/)?.[1];
          if (tweetId) {
            processedTweets.add(tweetId);
          }
        }
        return;
      }
      
      // 检查是否已经处理过
      const linkElement = tweetElement.querySelector('a[href*="/status/"]');
      if (!linkElement) {
        return;
      }
      
      const tweetId = linkElement.href.match(/\/status\/(\d+)/)?.[1];
      if (!tweetId) {
        return;
      }
      
      // 检查是否已经处理过（但允许重试）
      if (processedTweets.has(tweetId) && retryCount === 0) {
        return;
      }
      
      // 如果不是重试，立即标记为已处理，防止异步操作期间的重复调用
      if (retryCount === 0) {
        processedTweets.add(tweetId);
      }

      // 首先等待操作栏加载完成（特别是对于动态加载的页面）
      let actionBar = await waitForActionBar(tweetElement, retryCount > 0 ? 2000 : 1000);
      
      // 如果等待后仍找不到，使用多种方法查找
      if (!actionBar) {
        // 方法1: 查找 role="group" 的元素（最直接的方法）
        actionBar = tweetElement.querySelector('[role="group"]');
      }
      
      // 方法2: 通过回复按钮查找
      if (!actionBar) {
        const replyButton = tweetElement.querySelector('[data-testid="reply"]');
        if (replyButton) {
          // 向上查找包含role="group"的父元素
          actionBar = replyButton.closest('div[role="group"]');
          // 如果没找到，查找回复按钮的父容器
          if (!actionBar) {
            let parent = replyButton.parentElement;
            let depth = 0;
            while (parent && depth < 5 && parent !== tweetElement) {
              if (parent.getAttribute('role') === 'group' || 
                  parent.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]').length >= 2) {
                actionBar = parent;
                break;
              }
              parent = parent.parentElement;
              depth++;
            }
          }
        }
      }
      
      // 方法3: 通过所有操作按钮查找共同的父容器
      if (!actionBar) {
        const actionButtons = tweetElement.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="bookmark"], [data-testid="share"]');
        if (actionButtons.length > 0) {
          // 找到所有按钮的共同父元素
          const firstButton = actionButtons[0];
          let commonParent = firstButton.parentElement;
          
          // 验证这个父元素是否包含多个操作按钮
          let buttonCount = 0;
          for (const btn of actionButtons) {
            if (commonParent.contains(btn)) {
              buttonCount++;
            }
          }
          
          if (buttonCount >= 2) {
            actionBar = commonParent;
          } else {
            // 如果第一个父元素不包含多个按钮，向上查找
            let parent = firstButton.parentElement;
            let depth = 0;
            while (parent && depth < 10 && parent !== tweetElement) {
              buttonCount = 0;
              for (const btn of actionButtons) {
                if (parent.contains(btn)) {
                  buttonCount++;
                }
              }
              if (buttonCount >= 2) {
                actionBar = parent;
                break;
              }
              parent = parent.parentElement;
              depth++;
            }
          }
        }
      }
      
      // 方法4: 查找包含多个交互按钮的容器
      if (!actionBar) {
        const allButtons = tweetElement.querySelectorAll('button, [role="button"]');
        for (const btn of allButtons) {
          const btnParent = btn.parentElement;
          if (btnParent) {
            const siblingButtons = btnParent.querySelectorAll('button, [role="button"]');
            if (siblingButtons.length >= 3) {
              actionBar = btnParent;
              break;
            }
          }
        }
      }
      
      // 方法5: 针对单个推文详情页面的特殊处理
      // 在详情页面，操作栏可能在更深层的结构中
      if (!actionBar) {
        // 查找包含数字（表示互动数）的按钮容器
        const buttonsWithNumbers = tweetElement.querySelectorAll('button[aria-label*="回复"], button[aria-label*="Reply"], button[aria-label*="转推"], button[aria-label*="Repost"], button[aria-label*="喜欢"], button[aria-label*="Like"]');
        if (buttonsWithNumbers.length > 0) {
          // 找到这些按钮的共同父容器
          const firstBtn = buttonsWithNumbers[0];
          let parent = firstBtn.parentElement;
          let depth = 0;
          while (parent && depth < 15 && parent !== tweetElement) {
            // 检查这个父元素是否包含多个操作按钮
            const containedButtons = Array.from(buttonsWithNumbers).filter(btn => parent.contains(btn));
            if (containedButtons.length >= 2) {
              // 检查是否包含数字（互动数）
              const hasNumbers = Array.from(parent.querySelectorAll('span')).some(span => {
                const text = span.textContent.trim();
                return /^\d+[KMB]?$/.test(text) || /^\d+\.\d+[KMB]?$/.test(text);
              });
              if (hasNumbers || containedButtons.length >= 3) {
                actionBar = parent;
                break;
              }
            }
            parent = parent.parentElement;
            depth++;
          }
        }
      }
      
      // 方法6: 查找包含特定类名或属性的操作栏容器
      if (!actionBar) {
        // 查找包含 flex 布局的容器，通常操作栏使用 flex 布局
        const flexContainers = tweetElement.querySelectorAll('div[style*="display: flex"], div[class*="flex"]');
        for (const container of flexContainers) {
          const buttons = container.querySelectorAll('button, [role="button"]');
          // 如果容器包含至少3个按钮，可能是操作栏
          if (buttons.length >= 3) {
            // 检查是否包含常见的操作按钮标识
            const hasActionButtons = Array.from(buttons).some(btn => {
              const ariaLabel = btn.getAttribute('aria-label') || '';
              const testId = btn.getAttribute('data-testid') || '';
              return ariaLabel.includes('回复') || ariaLabel.includes('Reply') ||
                     ariaLabel.includes('转推') || ariaLabel.includes('Repost') ||
                     ariaLabel.includes('喜欢') || ariaLabel.includes('Like') ||
                     testId === 'reply' || testId === 'retweet' || testId === 'like';
            });
            if (hasActionButtons) {
              actionBar = container;
              break;
            }
          }
        }
      }
      
      // 如果还是找不到，延迟重试（可能是动态加载的）
      if (!actionBar) {
        if (retryCount < 3) {
          console.warn('[X推文追踪器] 未找到操作栏，推文ID:', tweetId, `将在${(retryCount + 1) * 500}ms后重试 (${retryCount + 1}/3)`);
          // 延迟重试，每次重试间隔递增
          setTimeout(() => {
            addSaveButtonToTweet(tweetElement, retryCount + 1).catch(err => {
              console.error('[X推文追踪器] 延迟重试添加按钮失败:', err);
            });
          }, (retryCount + 1) * 500);
          return;
        } else {
          console.error('[X推文追踪器] 多次重试后仍无法找到操作栏，推文ID:', tweetId);
          // 从processedTweets中移除，允许后续手动刷新
          processedTweets.delete(tweetId);
          return;
        }
      }

      // 再次检查操作栏中是否已经有保存按钮（双重检查）
      if (actionBar.querySelector(`.${SAVE_BUTTON_CLASS}, .${SAVED_BUTTON_CLASS}`)) {
        // 如果操作栏中已有按钮，从processedTweets中移除，因为可能是在其他地方添加的
        processedTweets.delete(tweetId);
        return;
      }

    // 创建保存按钮容器（先取类型文案用于按钮显示）
    const tweetInfoForType = extractTweetInfo(tweetElement);
    const typeLabel = TYPE_LABELS[tweetInfoForType?.type] || tweetInfoForType?.type || 'Tweet';

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; align-items: center; margin-left: 12px;';

    // 检查是否已保存
    const saved = await isTweetSaved(tweetId);
    let button = saved ? createSavedButton(typeLabel) : createSaveButton(typeLabel);
    
    // 添加点击事件处理函数
    async function handleButtonClick(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const tweetInfo = extractTweetInfo(tweetElement);
      if (!tweetInfo) {
        alert('无法提取推文信息');
        return;
      }

      const isCurrentlySaved = await isTweetSaved(tweetId);
      
      if (isCurrentlySaved) {
        // 取消保存
        const success = await unsaveTweet(tweetId);
        if (success) {
          const newButton = createSaveButton(typeLabel);
          buttonContainer.replaceChild(newButton, button);
          button = newButton;
          // 重新绑定事件
          newButton.addEventListener('click', handleButtonClick);
        }
      } else {
        // 保存推文
        const success = await saveTweet(tweetInfo);
        if (success) {
          const newButton = createSavedButton(typeLabel);
          buttonContainer.replaceChild(newButton, button);
          button = newButton;
          // 重新绑定事件
          newButton.addEventListener('click', handleButtonClick);
          // 显示保存成功提示
          showNotification('推文已保存！');
        } else {
          alert('保存失败，请重试');
        }
      }
    }
    
    button.addEventListener('click', handleButtonClick);

      buttonContainer.appendChild(button);
      actionBar.appendChild(buttonContainer);
      // processedTweets.add(tweetId) 已经在函数开始处执行，这里不需要重复添加
    } catch (error) {
      console.error('[X推文追踪器] 添加保存按钮时出错:', error);
    }
  }

  // 显示通知
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'x-tracker-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // 判断 keydown 是否与当前快捷键配置一致
  function matchesSaveFocusedShortcut(e) {
    const k = saveFocusedShortcut.key;
    const keyMatch = (e.key && k && (e.key === k || e.key.toUpperCase() === k || e.key.toLowerCase() === k.toLowerCase()));
    return keyMatch &&
      !!e.ctrlKey === !!saveFocusedShortcut.ctrlKey &&
      !!e.shiftKey === !!saveFocusedShortcut.shiftKey &&
      !!e.altKey === !!saveFocusedShortcut.altKey &&
      !!e.metaKey === !!saveFocusedShortcut.metaKey;
  }

  function matchesUnsaveFocusedShortcut(e) {
    const k = unsaveFocusedShortcut.key;
    const keyMatch = (e.key && k && (e.key === k || e.key.toUpperCase() === k || e.key.toLowerCase() === k.toLowerCase()));
    return keyMatch &&
      !!e.ctrlKey === !!unsaveFocusedShortcut.ctrlKey &&
      !!e.shiftKey === !!unsaveFocusedShortcut.shiftKey &&
      !!e.altKey === !!unsaveFocusedShortcut.altKey &&
      !!e.metaKey === !!unsaveFocusedShortcut.metaKey;
  }

  function matchesRedetectTypeShortcut(e) {
    const k = redetectTypeShortcut.key;
    const keyMatch = (e.key && k && (e.key === k || e.key.toUpperCase() === k || e.key.toLowerCase() === k.toLowerCase()));
    return keyMatch &&
      !!e.ctrlKey === !!redetectTypeShortcut.ctrlKey &&
      !!e.shiftKey === !!redetectTypeShortcut.shiftKey &&
      !!e.altKey === !!redetectTypeShortcut.altKey &&
      !!e.metaKey === !!redetectTypeShortcut.metaKey;
  }

  // 为推文上的保存/已保存按钮创建统一的点击处理（供快捷键保存后绑定用）
  function createTweetButtonClickHandler(tweetElement) {
    return async function handleToggle(e) {
      e.preventDefault();
      e.stopPropagation();
      const tweetInfo = extractTweetInfo(tweetElement);
      if (!tweetInfo) return;
      const typeLabel = TYPE_LABELS[tweetInfo.type] || tweetInfo.type || 'Tweet';
      const isSaved = await isTweetSaved(tweetInfo.id);
      const container = e.currentTarget.parentElement;
      const currentBtn = e.currentTarget;
      if (isSaved) {
        const success = await unsaveTweet(tweetInfo.id);
        if (success) {
          const newBtn = createSaveButton(typeLabel);
          container.replaceChild(newBtn, currentBtn);
          newBtn.addEventListener('click', createTweetButtonClickHandler(tweetElement));
        }
      } else {
        const success = await saveTweet(tweetInfo);
        if (success) {
          const newBtn = createSavedButton(typeLabel);
          container.replaceChild(newBtn, currentBtn);
          newBtn.addEventListener('click', createTweetButtonClickHandler(tweetElement));
          showNotification('推文已保存！');
        } else {
          alert('保存失败，请重试');
        }
      }
    };
  }

  // 快捷键：保存焦点推文
  async function saveFocusedTweetOnShortcut() {
    if (!currentFocusTweet) {
      showNotification('请将鼠标移到要保存的推文上');
      return;
    }
    const alreadySaved = currentFocusTweet.querySelector(`.${SAVED_BUTTON_CLASS}`);
    if (alreadySaved) {
      showNotification('该推文已保存');
      return;
    }
    const tweetInfo = extractTweetInfo(currentFocusTweet);
    if (!tweetInfo) {
      showNotification('无法提取推文信息');
      return;
    }
    const success = await saveTweet(tweetInfo);
    if (!success) {
      showNotification('保存失败，请重试');
      return;
    }
    const saveBtn = currentFocusTweet.querySelector(`.${SAVE_BUTTON_CLASS}`);
    if (saveBtn) {
      const buttonContainer = saveBtn.parentElement;
      const typeLabel = TYPE_LABELS[tweetInfo.type] || tweetInfo.type || 'Tweet';
      const newBtn = createSavedButton(typeLabel);
      buttonContainer.replaceChild(newBtn, saveBtn);
      newBtn.addEventListener('click', createTweetButtonClickHandler(currentFocusTweet));
    }
    currentFocusTweet.classList.remove(FOCUS_HIGHLIGHT_UNSAVED);
    currentFocusTweet.classList.add(FOCUS_HIGHLIGHT_SAVED);
    showNotification('推文已保存！');
  }

  // 快捷键：移除焦点已保存记录
  async function unsaveFocusedTweetOnShortcut() {
    if (!currentFocusTweet) {
      showNotification('请将鼠标移到要操作的推文上');
      return;
    }
    const savedBtn = currentFocusTweet.querySelector(`.${SAVED_BUTTON_CLASS}`);
    if (!savedBtn) {
      showNotification('该推文未保存');
      return;
    }
    const tweetInfo = extractTweetInfo(currentFocusTweet);
    if (!tweetInfo) {
      showNotification('无法提取推文信息');
      return;
    }
    const success = await unsaveTweet(tweetInfo.id);
    if (!success) {
      showNotification('移除失败，请重试');
      return;
    }
    const buttonContainer = savedBtn.parentElement;
    const typeLabel = TYPE_LABELS[tweetInfo.type] || tweetInfo.type || 'Tweet';
    const newBtn = createSaveButton(typeLabel);
    buttonContainer.replaceChild(newBtn, savedBtn);
    newBtn.addEventListener('click', createTweetButtonClickHandler(currentFocusTweet));
    currentFocusTweet.classList.remove(FOCUS_HIGHLIGHT_SAVED);
    currentFocusTweet.classList.add(FOCUS_HIGHLIGHT_UNSAVED);
    showNotification('已移除保存');
  }

  // 快捷键：重新判断焦点推文类型
  async function redetectFocusedTweetType() {
    if (!currentFocusTweet) {
      showNotification('请将鼠标移到要重判类型的推文上');
      return;
    }
    const tweetInfo = extractTweetInfo(currentFocusTweet);
    if (!tweetInfo) {
      showNotification('无法提取推文信息');
      return;
    }
    const typeLabel = TYPE_LABELS[tweetInfo.type] || tweetInfo.type || 'Tweet';
    const existingBtn = currentFocusTweet.querySelector(`.${SAVE_BUTTON_CLASS}, .${SAVED_BUTTON_CLASS}`);
    if (existingBtn) {
      const container = existingBtn.parentElement;
      const isSaved = existingBtn.classList.contains(SAVED_BUTTON_CLASS);
      const newBtn = isSaved ? createSavedButton(typeLabel) : createSaveButton(typeLabel);
      container.replaceChild(newBtn, existingBtn);
      newBtn.addEventListener('click', createTweetButtonClickHandler(currentFocusTweet));
    }
    const saved = await isTweetSaved(tweetInfo.id);
    if (saved) {
      await saveTweet(tweetInfo);
    }
    showNotification('类型已更新为 ' + typeLabel);
  }

  // 加载快捷键配置并监听 storage 变化
  function loadSaveFocusedShortcut() {
    chrome.storage.local.get([SHORTCUT_STORAGE_KEY], (result) => {
      if (result[SHORTCUT_STORAGE_KEY] && typeof result[SHORTCUT_STORAGE_KEY] === 'object') {
        saveFocusedShortcut = { ...DEFAULT_SHORTCUT, ...result[SHORTCUT_STORAGE_KEY] };
      }
    });
  }

  function loadUnsaveFocusedShortcut() {
    chrome.storage.local.get([UNSAVE_SHORTCUT_STORAGE_KEY], (result) => {
      if (result[UNSAVE_SHORTCUT_STORAGE_KEY] && typeof result[UNSAVE_SHORTCUT_STORAGE_KEY] === 'object') {
        unsaveFocusedShortcut = { ...DEFAULT_UNSAVE_SHORTCUT, ...result[UNSAVE_SHORTCUT_STORAGE_KEY] };
      }
    });
  }

  function loadRedetectTypeShortcut() {
    chrome.storage.local.get([REDETECT_TYPE_STORAGE_KEY], (result) => {
      if (result[REDETECT_TYPE_STORAGE_KEY] && typeof result[REDETECT_TYPE_STORAGE_KEY] === 'object') {
        redetectTypeShortcut = { ...DEFAULT_REDETECT_SHORTCUT, ...result[REDETECT_TYPE_STORAGE_KEY] };
      }
    });
  }

  // 注册快捷键监听与 storage 监听（冲突时提示，否则按优先级：重判类型 > 移除 > 保存）
  function setupSaveFocusedShortcut() {
    loadSaveFocusedShortcut();
    loadUnsaveFocusedShortcut();
    loadRedetectTypeShortcut();
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes[SHORTCUT_STORAGE_KEY]) {
        const next = changes[SHORTCUT_STORAGE_KEY].newValue;
        if (next && typeof next === 'object') {
          saveFocusedShortcut = { ...DEFAULT_SHORTCUT, ...next };
        }
      }
      if (changes[UNSAVE_SHORTCUT_STORAGE_KEY]) {
        const next = changes[UNSAVE_SHORTCUT_STORAGE_KEY].newValue;
        if (next && typeof next === 'object') {
          unsaveFocusedShortcut = { ...DEFAULT_UNSAVE_SHORTCUT, ...next };
        }
      }
      if (changes[REDETECT_TYPE_STORAGE_KEY]) {
        const next = changes[REDETECT_TYPE_STORAGE_KEY].newValue;
        if (next && typeof next === 'object') {
          redetectTypeShortcut = { ...DEFAULT_REDETECT_SHORTCUT, ...next };
        }
      }
    });
    document.addEventListener('keydown', (e) => {
      const matchSave = matchesSaveFocusedShortcut(e);
      const matchUnsave = matchesUnsaveFocusedShortcut(e);
      const matchRedetect = matchesRedetectTypeShortcut(e);
      if (!matchSave && !matchUnsave && !matchRedetect) return;
      e.preventDefault();
      e.stopPropagation();
      const matchCount = (matchSave ? 1 : 0) + (matchUnsave ? 1 : 0) + (matchRedetect ? 1 : 0);
      if (matchCount >= 2) {
        showNotification('快捷键冲突，请在设置中修改');
        return;
      }
      if (matchRedetect) {
        redetectFocusedTweetType();
      } else if (matchUnsave) {
        unsaveFocusedTweetOnShortcut();
      } else {
        saveFocusedTweetOnShortcut();
      }
    }, true);
  }

  // 处理所有推文
  function processTweets() {
    try {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      console.log(`[X推文追踪器] 找到 ${tweets.length} 条推文，开始处理`);
      
      // 先检查已存在的按钮，更新processedTweets Set
      tweets.forEach((tweet) => {
        const existingButton = tweet.querySelector(`.${SAVE_BUTTON_CLASS}, .${SAVED_BUTTON_CLASS}`);
        if (existingButton) {
          const linkElement = tweet.querySelector('a[href*="/status/"]');
          if (linkElement) {
            const tweetId = linkElement.href.match(/\/status\/(\d+)/)?.[1];
            if (tweetId) {
              processedTweets.add(tweetId);
            }
          }
        }
      });
      
      // 然后为没有按钮的推文添加按钮
      // 使用Promise.all确保所有异步操作完成
      const promises = [];
      tweets.forEach((tweet, index) => {
        try {
          // 检查是否已经有按钮
          const hasButton = tweet.querySelector(`.${SAVE_BUTTON_CLASS}, .${SAVED_BUTTON_CLASS}`);
          if (!hasButton) {
            // 检查是否有操作栏（即使还没有按钮）
            const hasActionBar = tweet.querySelector('[role="group"]') || 
                                 tweet.querySelector('[data-testid="reply"]') ||
                                 tweet.querySelector('[data-testid="retweet"]') ||
                                 tweet.querySelector('[data-testid="like"]');
            
            if (hasActionBar) {
              // 如果有操作栏，立即尝试添加按钮
              promises.push(addSaveButtonToTweet(tweet, 0).catch(error => {
                console.error(`[X推文追踪器] 处理第${index + 1}条推文时出错:`, error);
              }));
            } else {
              // 如果没有操作栏，延迟处理（可能是动态加载的）
              setTimeout(() => {
                addSaveButtonToTweet(tweet, 0).catch(error => {
                  console.error(`[X推文追踪器] 延迟处理第${index + 1}条推文时出错:`, error);
                });
              }, 500);
            }
          }
        } catch (error) {
          console.error(`[X推文追踪器] 处理第${index + 1}条推文时出错:`, error);
        }
      });
      
      // 等待所有按钮添加完成
      Promise.all(promises).catch(() => {
        // 忽略错误，因为已经在上面处理了
      });
    } catch (error) {
      console.error('[X推文追踪器] 处理推文时出错:', error);
    }
  }

  // 使用MutationObserver监听新推文
  const observer = new MutationObserver((mutations) => {
    // 检查是否有新的推文元素添加或DOM结构变化
    let hasNewTweets = false;
    let hasStructureChange = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              hasNewTweets = true;
              break;
            }
            if (node.querySelector && node.querySelector('article[data-testid="tweet"]')) {
              hasNewTweets = true;
              break;
            }
            // 检查是否是操作按钮相关的元素（可能是动态加载的操作栏）
            if (node.matches && (
                node.matches('[role="group"]') ||
                node.matches('[data-testid="reply"]') ||
                node.matches('[data-testid="retweet"]') ||
                node.matches('[data-testid="like"]')
              )) {
              hasStructureChange = true;
            }
          }
        }
        if (hasNewTweets) break;
      }
      
      // 检查属性变化（可能是操作栏的显示状态改变）
      if (mutation.type === 'attributes' && mutation.target) {
        const target = mutation.target;
        if (target.matches && (
            target.matches('article[data-testid="tweet"]') ||
            target.closest('article[data-testid="tweet"]')
          )) {
          hasStructureChange = true;
        }
      }
    }
    
    // 延迟处理，避免频繁触发
    if (hasNewTweets) {
      setTimeout(() => {
        processTweets();
      }, 500);
    } else if (hasStructureChange) {
      // 对于结构变化，延迟更长时间，确保DOM完全更新
      setTimeout(() => {
        processTweets();
      }, 1000);
    }
  });

  // 强制刷新所有按钮（清空已处理记录并重新处理）
  function forceRefreshButtons() {
    console.log('[X推文追踪器] 强制刷新保存按钮');
    // 清空已处理的推文记录
    processedTweets.clear();
    // 重新处理所有推文
    processTweets();
    // 延迟再次处理，确保所有推文都被处理
    setTimeout(() => processTweets(), 500);
    setTimeout(() => processTweets(), 1500);
  }

  // 设置焦点推文高亮：节流 mousemove + elementFromPoint，更新 currentFocusTweet 与高亮类
  function setupFocusTweetHighlight() {
    const THROTTLE_MS = 60;
    let lastRun = 0;
    let scheduled = null;
    let lastEvent = null;

    function updateFocus(e) {
      if (!e) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const tweet = el?.closest('article[data-testid="tweet"]');
      if (tweet === currentFocusTweet) return;
      if (currentFocusTweet) {
        currentFocusTweet.classList.remove(FOCUS_HIGHLIGHT_UNSAVED, FOCUS_HIGHLIGHT_SAVED);
      }
      currentFocusTweet = tweet || null;
      if (currentFocusTweet) {
        const isSaved = currentFocusTweet.querySelector(`.${SAVED_BUTTON_CLASS}`);
        currentFocusTweet.classList.add(isSaved ? FOCUS_HIGHLIGHT_SAVED : FOCUS_HIGHLIGHT_UNSAVED);
      }
    }

    function throttledMousemove(e) {
      lastEvent = e;
      const now = Date.now();
      if (now - lastRun >= THROTTLE_MS) {
        lastRun = now;
        updateFocus(e);
        if (scheduled) {
          clearTimeout(scheduled);
          scheduled = null;
        }
      } else if (!scheduled) {
        scheduled = setTimeout(() => {
          scheduled = null;
          lastRun = Date.now();
          updateFocus(lastEvent);
        }, THROTTLE_MS);
      }
    }

    document.addEventListener('mousemove', throttledMousemove, { passive: true });
    document.addEventListener('mouseleave', () => {
      if (currentFocusTweet) {
        currentFocusTweet.classList.remove(FOCUS_HIGHLIGHT_UNSAVED, FOCUS_HIGHLIGHT_SAVED);
        currentFocusTweet = null;
      }
    });
  }

  // 创建悬浮窗
  function createFloatingWidget() {
    // 检查是否已存在悬浮窗
    if (document.querySelector('.x-tracker-floating-widget')) {
      return;
    }

    const widget = document.createElement('div');
    widget.className = 'x-tracker-floating-widget';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'x-tracker-floating-btn';
    refreshBtn.setAttribute('aria-label', '刷新保存按钮');
    refreshBtn.setAttribute('title', '刷新保存按钮');
    refreshBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
    `;

    // 添加点击事件
    refreshBtn.addEventListener('click', () => {
      // 添加加载动画
      refreshBtn.classList.add('loading');
      
      // 执行刷新
      forceRefreshButtons();
      
      // 显示提示
      showNotification('正在刷新保存按钮...');
      
      // 1秒后移除加载动画
      setTimeout(() => {
        refreshBtn.classList.remove('loading');
        showNotification('刷新完成！');
      }, 1000);
    });

    widget.appendChild(refreshBtn);
    document.body.appendChild(widget);

    console.log('[X推文追踪器] 悬浮窗已创建');
  }

  // 初始化
  function init() {
    try {
      // 创建悬浮窗
      createFloatingWidget();
      
      // 立即开始观察，以便捕获所有DOM变化
      startObserving();

      // 焦点推文边框高亮（mousemove 跟踪）
      setupFocusTweetHighlight();

      // 保存焦点推文快捷键
      setupSaveFocusedShortcut();

      // 等待页面加载完成后再处理推文
      const processWhenReady = () => {
        // 多次尝试处理，因为X网站是动态加载的
        // 特别是单个推文详情页面，可能需要更多时间加载
        processTweets();
        setTimeout(() => processTweets(), 500);
        setTimeout(() => processTweets(), 1000);
        setTimeout(() => processTweets(), 2000);
        setTimeout(() => processTweets(), 3000);
        // 对于单个推文详情页面，增加更长的延迟重试
        setTimeout(() => processTweets(), 5000);
      };
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(processWhenReady, 500);
        });
      } else {
        setTimeout(processWhenReady, 500);
      }
      
      // 监听页面可见性变化，当页面重新可见时重新处理
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          setTimeout(() => processTweets(), 500);
          setTimeout(() => processTweets(), 2000);
        }
      });
      
      // 监听浏览器前进/后退事件（SPA导航）
      window.addEventListener('popstate', () => {
        console.log('[X推文追踪器] 检测到页面导航（popstate），重新处理推文');
        // 延迟处理，等待页面内容更新
        setTimeout(() => {
          processedTweets.clear();
          processTweets();
        }, 300);
        setTimeout(() => processTweets(), 1000);
        setTimeout(() => processTweets(), 3000);
      });
      
      // 监听页面显示事件（包括从缓存恢复和前进/后退）
      window.addEventListener('pageshow', (event) => {
        // event.persisted 为 true 表示页面是从缓存中恢复的
        if (event.persisted) {
          console.log('[X推文追踪器] 页面从缓存恢复，重新处理推文');
          setTimeout(() => {
            processedTweets.clear();
            processTweets();
          }, 300);
          setTimeout(() => processTweets(), 1000);
          setTimeout(() => processTweets(), 3000);
        }
      });
      
      // 监听来自background script的刷新请求
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'refreshButtons') {
          console.log('[X推文追踪器] 收到刷新按钮请求');
          forceRefreshButtons();
          sendResponse({ success: true });
          return true;
        }
      });
    } catch (error) {
      console.error('X推文追踪器初始化失败:', error);
    }
  }

  // 开始观察DOM变化
  function startObserving() {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 启动
  init();
})();
