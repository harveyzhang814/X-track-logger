// 调试脚本 - 在X网页的控制台中运行此代码来测试

// 1. 检查是否能找到推文
console.log('=== 调试信息 ===');
console.log('推文数量:', document.querySelectorAll('article[data-testid="tweet"]').length);

// 2. 检查第一条推文的结构
const firstTweet = document.querySelector('article[data-testid="tweet"]');
if (firstTweet) {
  console.log('找到第一条推文');
  console.log('推文链接:', firstTweet.querySelector('a[href*="/status/"]')?.href);
  
  // 3. 检查操作按钮区域
  const actionBar = firstTweet.querySelector('[role="group"]');
  console.log('操作按钮区域:', actionBar ? '找到' : '未找到');
  
  // 4. 检查回复按钮
  const replyButton = firstTweet.querySelector('[data-testid="reply"]');
  console.log('回复按钮:', replyButton ? '找到' : '未找到');
  
  if (replyButton) {
    const actionBarAlt = replyButton.closest('div[role="group"]');
    console.log('通过回复按钮找到操作区域:', actionBarAlt ? '找到' : '未找到');
  }
} else {
  console.log('未找到推文');
}

// 5. 检查扩展是否加载
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('Chrome扩展API可用');
  chrome.runtime.sendMessage({action: 'ping'}, (response) => {
    console.log('扩展响应:', response);
  });
} else {
  console.log('Chrome扩展API不可用');
}

