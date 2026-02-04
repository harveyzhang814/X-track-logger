// X推文追踪器 - Popup脚本

let savedTweets = {};
let currentFilter = 'all';

// 保存焦点推文快捷键（与 content.js 一致）
const SHORTCUT_STORAGE_KEY = 'xTrackerSaveFocusedShortcut';
const DEFAULT_SHORTCUT = { key: 'S', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };
// 移除焦点已保存记录快捷键
const UNSAVE_SHORTCUT_STORAGE_KEY = 'xTrackerUnsaveFocusedShortcut';
const DEFAULT_UNSAVE_SHORTCUT = { key: 'D', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };
// 重新判断焦点推文类型快捷键
const REDETECT_TYPE_STORAGE_KEY = 'xTrackerRedetectTypeShortcut';
const DEFAULT_REDETECT_SHORTCUT = { key: 'T', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };

function shortcutsEqual(a, b) {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keyA = (a.key || '').toLowerCase();
  const keyB = (b.key || '').toLowerCase();
  return keyA === keyB &&
    !!a.ctrlKey === !!b.ctrlKey &&
    !!a.shiftKey === !!b.shiftKey &&
    !!a.altKey === !!b.altKey &&
    !!a.metaKey === !!b.metaKey;
}

function shortcutToDisplayString(s) {
  if (!s || typeof s.key !== 'string') return 'Ctrl+Shift+S';
  const parts = [];
  if (s.ctrlKey) parts.push('Ctrl');
  if (s.altKey) parts.push('Alt');
  if (s.metaKey) parts.push('Cmd');
  if (s.shiftKey) parts.push('Shift');
  parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts.join('+');
}

function loadShortcutSetting() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SHORTCUT_STORAGE_KEY], (result) => {
      const s = result[SHORTCUT_STORAGE_KEY];
      resolve(s && typeof s === 'object' ? { ...DEFAULT_SHORTCUT, ...s } : { ...DEFAULT_SHORTCUT });
    });
  });
}

function updateShortcutDisplay(shortcut) {
  const el = document.getElementById('shortcutDisplay');
  if (el) el.textContent = '当前：' + shortcutToDisplayString(shortcut);
}

function saveShortcutToStorage(shortcut) {
  chrome.storage.local.set({ [SHORTCUT_STORAGE_KEY]: shortcut });
}

function loadUnsaveShortcutSetting() {
  return new Promise((resolve) => {
    chrome.storage.local.get([UNSAVE_SHORTCUT_STORAGE_KEY], (result) => {
      const s = result[UNSAVE_SHORTCUT_STORAGE_KEY];
      resolve(s && typeof s === 'object' ? { ...DEFAULT_UNSAVE_SHORTCUT, ...s } : { ...DEFAULT_UNSAVE_SHORTCUT });
    });
  });
}

function updateUnsaveShortcutDisplay(shortcut) {
  const el = document.getElementById('shortcutDisplayUnsave');
  if (el) el.textContent = '当前：' + shortcutToDisplayString(shortcut);
}

function saveUnsaveShortcutToStorage(shortcut) {
  chrome.storage.local.set({ [UNSAVE_SHORTCUT_STORAGE_KEY]: shortcut });
}

function loadRedetectTypeShortcutSetting() {
  return new Promise((resolve) => {
    chrome.storage.local.get([REDETECT_TYPE_STORAGE_KEY], (result) => {
      const s = result[REDETECT_TYPE_STORAGE_KEY];
      resolve(s && typeof s === 'object' ? { ...DEFAULT_REDETECT_SHORTCUT, ...s } : { ...DEFAULT_REDETECT_SHORTCUT });
    });
  });
}

function updateRedetectTypeShortcutDisplay(shortcut) {
  const el = document.getElementById('shortcutDisplayRedetect');
  if (el) el.textContent = '当前：' + shortcutToDisplayString(shortcut);
}

function saveRedetectTypeShortcutToStorage(shortcut) {
  chrome.storage.local.set({ [REDETECT_TYPE_STORAGE_KEY]: shortcut });
}

// 更新存储状态显示
function updateStorageStatus(status, message = '') {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  
  if (!statusIndicator || !statusText) return;
  
  // 移除所有状态类
  statusIndicator.className = 'status-indicator';
  
  switch (status) {
    case 'ready':
      statusIndicator.classList.add('ready');
      statusText.textContent = 'Chrome Storage 已就绪';
      break;
    case 'loading':
      statusIndicator.classList.add('loading');
      statusText.textContent = message || '正在初始化 Chrome Storage...';
      break;
    case 'error':
      statusIndicator.classList.add('error');
      statusText.textContent = `Chrome Storage 错误: ${message || '初始化失败'}`;
      break;
    default:
      statusText.textContent = message || '未知状态';
  }
}

// 通过 background script 加载已保存的推文
async function loadTweets() {
  try {
    // 更新状态为加载中
    updateStorageStatus('loading', '正在加载数据...');
    
    // 通过消息传递从 background script 获取数据
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'getAllTweets' },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      );
    });
    
    savedTweets = response.tweets || {};
    console.log('[X推文追踪器] Popup 加载的推文:', Object.keys(savedTweets).length, '条');
    
    if (Object.keys(savedTweets).length > 0) {
      console.log('[X推文追踪器] 推文ID列表（前5个）:', Object.keys(savedTweets).slice(0, 5));
    }
    
    updateStorageStatus('ready');
    
    // 更新存储使用量显示
    await updateStorageUsage();
    
    renderTweets();
  } catch (error) {
    console.error('加载推文时出错:', error);
    updateStorageStatus('error', error.message);
    savedTweets = {};
    renderTweets();
  }
}


// 更新存储使用量显示
async function updateStorageUsage() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getStorageUsage' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ usage: '未知' });
          } else {
            resolve(response || { usage: '未知' });
          }
        }
      );
    });
    
    const usage = response.usage || '未知';
    const statsElement = document.querySelector('.stats');
    if (statsElement) {
      const usageElement = document.getElementById('storageUsage');
      if (!usageElement) {
        const usageSpan = document.createElement('span');
        usageSpan.id = 'storageUsage';
        usageSpan.style.cssText = 'font-size: 12px; color: rgb(113, 118, 123); margin-left: 8px;';
        usageSpan.textContent = `(${usage})`;
        statsElement.appendChild(usageSpan);
      } else {
        usageElement.textContent = `(${usage})`;
      }
    }
  } catch (error) {
    // 忽略错误
  }
}

// 渲染推文列表
function renderTweets() {
  const tweetsList = document.getElementById('tweetsList');
  const tweetCount = document.getElementById('tweetCount');
  
  // 过滤推文
  let filteredTweets = Object.values(savedTweets);
  if (currentFilter !== 'all') {
    filteredTweets = filteredTweets.filter(tweet => tweet.type === currentFilter);
  }
  
  // 按保存时间倒序排列
  filteredTweets.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  
  tweetCount.textContent = `${filteredTweets.length} 条推文`;
  
  if (filteredTweets.length === 0) {
    tweetsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
        </svg>
        <p>还没有保存任何推文</p>
        <p class="hint">在X网页上点击推文旁的"保存"按钮即可保存</p>
      </div>
    `;
    return;
  }
  
  tweetsList.innerHTML = filteredTweets.map(tweet => createTweetHTML(tweet)).join('');
  
  // 添加事件监听器
  filteredTweets.forEach(tweet => {
    const tweetElement = document.querySelector(`[data-tweet-id="${tweet.id}"]`);
    if (tweetElement) {
      // 点击推文打开链接
      tweetElement.addEventListener('click', (e) => {
        if (!e.target.closest('.tweet-actions')) {
          if (tweet.link) {
            chrome.tabs.create({ url: tweet.link });
          }
        }
      });
      
      // 删除按钮
      const deleteBtn = tweetElement.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('确定要删除这条推文吗？')) {
            await deleteTweet(tweet.id);
          }
        });
      }
      
      // 复制链接按钮
      const copyBtn = tweetElement.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (tweet.link) {
            await navigator.clipboard.writeText(tweet.link);
            showToast('链接已复制到剪贴板');
          }
        });
      }
    }
  });
}

// 创建推文HTML
function createTweetHTML(tweet) {
  const date = new Date(tweet.date);
  const dateStr = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const typeLabels = {
    tweet: 'Tweet',
    reply: 'Reply',
    repost: 'Repost',
    quote: 'Quote'
  };
  
  return `
    <div class="tweet-item" data-tweet-id="${tweet.id}">
      <div class="tweet-header">
        <div>
          <span class="tweet-author">${escapeHtml(tweet.author.name || '未知')}</span>
          <span class="tweet-handle">@${escapeHtml(tweet.author.handle || 'unknown')}</span>
        </div>
        <span class="tweet-type ${tweet.type}">${typeLabels[tweet.type] || tweet.type}</span>
      </div>
      <div class="tweet-text">${escapeHtml(tweet.text)}</div>
      ${tweet.quotedTweet ? `
        <div class="quoted-tweet">
          <div class="quoted-tweet-header">
            <span class="quoted-tweet-author">${escapeHtml(tweet.quotedTweet.author.name || '未知')}</span>
            <span class="quoted-tweet-handle">@${escapeHtml(tweet.quotedTweet.author.handle || 'unknown')}</span>
          </div>
          <div class="quoted-tweet-text">${escapeHtml(tweet.quotedTweet.text)}</div>
        </div>
      ` : ''}
      <div class="tweet-meta">
        <span>${dateStr}</span>
        <div class="tweet-actions">
          <button class="tweet-action-btn copy-btn" title="复制链接">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
          <button class="tweet-action-btn delete-btn" title="删除">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// 转义HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 删除推文
async function deleteTweet(tweetId) {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'deleteTweet', tweetId },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false });
          }
        }
      );
    });
    
    if (response.success) {
      await loadTweets();
      showToast('推文已删除');
    } else {
      showToast('删除失败');
    }
  } catch (error) {
    console.error('删除推文时出错:', error);
    showToast('删除失败');
  }
}

// 导出数据
async function exportData() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getAllTweets' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ tweets: {} });
          } else {
            resolve(response || { tweets: {} });
          }
        }
      );
    });
    
    const data = response.tweets || {};
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `x-tweets-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据已导出');
  } catch (error) {
    console.error('导出数据时出错:', error);
    showToast('导出失败');
  }
}

// 清空所有数据
async function clearAll() {
  if (confirm('确定要清空所有保存的推文吗？此操作不可恢复！')) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'clearAll' },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { success: false });
            }
          }
        );
      });
      
      if (response.success) {
        await loadTweets();
        showToast('已清空所有推文');
      } else {
        showToast('清空失败');
      }
    } catch (error) {
      console.error('清空数据时出错:', error);
      showToast('清空失败');
    }
  }
}

// 显示提示
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// 刷新保存按钮
async function refreshButtons() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'refreshButtons' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false });
          }
        }
      );
    });
    
    if (response.success) {
      showToast('已刷新保存按钮');
    } else {
      showToast('刷新失败');
    }
  } catch (error) {
    console.error('刷新按钮时出错:', error);
    showToast('刷新失败');
  }
}

// 事件监听
document.getElementById('refreshBtn').addEventListener('click', refreshButtons);
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('clearBtn').addEventListener('click', clearAll);
document.getElementById('filterType').addEventListener('change', (e) => {
  currentFilter = e.target.value;
  renderTweets();
});

// 设置面板与主面板切换
const mainPanel = document.getElementById('mainPanel');
const settingsPanel = document.getElementById('settingsPanel');
const settingsBtn = document.getElementById('settingsBtn');
const recordShortcutBtn = document.getElementById('recordShortcutBtn');
const resetShortcutBtn = document.getElementById('resetShortcutBtn');
const shortcutInput = document.getElementById('shortcutInput');
const shortcutDisplay = document.getElementById('shortcutDisplay');

settingsBtn.addEventListener('click', () => {
  const inSettings = settingsPanel.classList.contains('panel-active');
  if (inSettings) {
    mainPanel.classList.add('panel-active');
    settingsPanel.classList.remove('panel-active');
  } else {
    mainPanel.classList.remove('panel-active');
    settingsPanel.classList.add('panel-active');
    loadShortcutSetting().then(updateShortcutDisplay);
    loadUnsaveShortcutSetting().then(updateUnsaveShortcutDisplay);
    loadRedetectTypeShortcutSetting().then(updateRedetectTypeShortcutDisplay);
  }
});

// 录制快捷键
let recordingKeydown = null;
function stopRecording() {
  if (recordingKeydown) {
    shortcutInput.removeEventListener('keydown', recordingKeydown);
    recordingKeydown = null;
  }
  recordShortcutBtn.classList.remove('recording');
  shortcutInput.placeholder = '点击「录制快捷键」后在此按下组合键';
  shortcutInput.blur();
}
recordShortcutBtn.addEventListener('click', () => {
  stopRecording();
  shortcutInput.value = '';
  shortcutInput.placeholder = '请按下组合键...';
  recordShortcutBtn.classList.add('recording');
  shortcutInput.focus();
  recordingKeydown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const key = e.key;
    if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;
    const shortcut = {
      key: key.length === 1 ? key.toUpperCase() : key,
      ctrlKey: !!e.ctrlKey,
      shiftKey: !!e.shiftKey,
      altKey: !!e.altKey,
      metaKey: !!e.metaKey
    };
    saveShortcutToStorage(shortcut);
    updateShortcutDisplay(shortcut);
    shortcutInput.value = shortcutToDisplayString(shortcut);
    stopRecording();
  };
  shortcutInput.addEventListener('keydown', recordingKeydown);
});

resetShortcutBtn.addEventListener('click', () => {
  saveShortcutToStorage(DEFAULT_SHORTCUT);
  updateShortcutDisplay(DEFAULT_SHORTCUT);
  shortcutInput.value = '';
  showToast('已恢复默认快捷键');
});

const shortcutDisplayUnsave = document.getElementById('shortcutDisplayUnsave');
const recordShortcutBtnUnsave = document.getElementById('recordShortcutBtnUnsave');
const resetShortcutBtnUnsave = document.getElementById('resetShortcutBtnUnsave');
const shortcutInputUnsave = document.getElementById('shortcutInputUnsave');

let recordingKeydownUnsave = null;
function stopRecordingUnsave() {
  if (recordingKeydownUnsave) {
    shortcutInputUnsave.removeEventListener('keydown', recordingKeydownUnsave);
    recordingKeydownUnsave = null;
  }
  recordShortcutBtnUnsave.classList.remove('recording');
  shortcutInputUnsave.placeholder = '点击「录制快捷键」后在此按下组合键';
  shortcutInputUnsave.blur();
}
recordShortcutBtnUnsave.addEventListener('click', () => {
  stopRecordingUnsave();
  shortcutInputUnsave.value = '';
  shortcutInputUnsave.placeholder = '请按下组合键...';
  recordShortcutBtnUnsave.classList.add('recording');
  shortcutInputUnsave.focus();
  recordingKeydownUnsave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const key = e.key;
    if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;
    const shortcut = {
      key: key.length === 1 ? key.toUpperCase() : key,
      ctrlKey: !!e.ctrlKey,
      shiftKey: !!e.shiftKey,
      altKey: !!e.altKey,
      metaKey: !!e.metaKey
    };
    saveUnsaveShortcutToStorage(shortcut);
    updateUnsaveShortcutDisplay(shortcut);
    shortcutInputUnsave.value = shortcutToDisplayString(shortcut);
    stopRecordingUnsave();
  };
  shortcutInputUnsave.addEventListener('keydown', recordingKeydownUnsave);
});

resetShortcutBtnUnsave.addEventListener('click', () => {
  saveUnsaveShortcutToStorage(DEFAULT_UNSAVE_SHORTCUT);
  updateUnsaveShortcutDisplay(DEFAULT_UNSAVE_SHORTCUT);
  shortcutInputUnsave.value = '';
  showToast('已恢复默认快捷键');
});

const shortcutDisplayRedetect = document.getElementById('shortcutDisplayRedetect');
const recordShortcutBtnRedetect = document.getElementById('recordShortcutBtnRedetect');
const resetShortcutBtnRedetect = document.getElementById('resetShortcutBtnRedetect');
const shortcutInputRedetect = document.getElementById('shortcutInputRedetect');

let recordingKeydownRedetect = null;
function stopRecordingRedetect() {
  if (recordingKeydownRedetect) {
    shortcutInputRedetect.removeEventListener('keydown', recordingKeydownRedetect);
    recordingKeydownRedetect = null;
  }
  if (recordShortcutBtnRedetect) recordShortcutBtnRedetect.classList.remove('recording');
  if (shortcutInputRedetect) {
    shortcutInputRedetect.placeholder = '点击「录制快捷键」后在此按下组合键';
    shortcutInputRedetect.blur();
  }
}
if (recordShortcutBtnRedetect) {
  recordShortcutBtnRedetect.addEventListener('click', () => {
    stopRecordingRedetect();
    if (shortcutInputRedetect) shortcutInputRedetect.value = '';
    if (shortcutInputRedetect) shortcutInputRedetect.placeholder = '请按下组合键...';
    recordShortcutBtnRedetect.classList.add('recording');
    shortcutInputRedetect.focus();
    recordingKeydownRedetect = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = e.key;
      if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;
      const shortcut = {
        key: key.length === 1 ? key.toUpperCase() : key,
        ctrlKey: !!e.ctrlKey,
        shiftKey: !!e.shiftKey,
        altKey: !!e.altKey,
        metaKey: !!e.metaKey
      };
      Promise.all([loadShortcutSetting(), loadUnsaveShortcutSetting()]).then(([saveS, unsaveS]) => {
        if (shortcutsEqual(shortcut, saveS) || shortcutsEqual(shortcut, unsaveS)) {
          showToast('与保存/移除快捷键冲突，请换用其他组合');
          stopRecordingRedetect();
          return;
        }
        saveRedetectTypeShortcutToStorage(shortcut);
        updateRedetectTypeShortcutDisplay(shortcut);
        if (shortcutInputRedetect) shortcutInputRedetect.value = shortcutToDisplayString(shortcut);
        stopRecordingRedetect();
      });
    };
    shortcutInputRedetect.addEventListener('keydown', recordingKeydownRedetect);
  });
}
if (resetShortcutBtnRedetect) {
  resetShortcutBtnRedetect.addEventListener('click', () => {
    saveRedetectTypeShortcutToStorage(DEFAULT_REDETECT_SHORTCUT);
    updateRedetectTypeShortcutDisplay(DEFAULT_REDETECT_SHORTCUT);
    if (shortcutInputRedetect) shortcutInputRedetect.value = '';
    showToast('已恢复默认快捷键');
  });
}

// 初始化设置页的快捷键显示（若当前在设置页会由切换时加载）
loadShortcutSetting().then((s) => {
  if (shortcutDisplay) shortcutDisplay.textContent = '当前：' + shortcutToDisplayString(s);
});
loadUnsaveShortcutSetting().then((s) => {
  if (shortcutDisplayUnsave) shortcutDisplayUnsave.textContent = '当前：' + shortcutToDisplayString(s);
});
loadRedetectTypeShortcutSetting().then((s) => {
  if (shortcutDisplayRedetect) shortcutDisplayRedetect.textContent = '当前：' + shortcutToDisplayString(s);
});

// 监听存储变化（通过轮询检查，因为IndexedDB没有change事件）
let lastTweetCount = 0;
setInterval(() => {
  chrome.runtime.sendMessage(
    { action: 'getAllTweets' },
    (response) => {
      if (!chrome.runtime.lastError && response?.tweets) {
        const currentCount = Object.keys(response.tweets).length;
        if (currentCount !== lastTweetCount) {
          lastTweetCount = currentCount;
          loadTweets();
        }
      }
    }
  );
}, 2000); // 每2秒检查一次

// 初始化
loadTweets();

