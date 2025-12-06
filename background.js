// X推文追踪器 - Background Service Worker

// 导入存储模块（在 background 中直接使用 IndexedDB）
importScripts('storage.js');

// 监听来自content script和popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 异步处理
  (async () => {
    try {
      switch (request.action) {
        case 'saveTweet':
          await tweetStorage.init();
          const success = await tweetStorage.saveTweet(request.tweetInfo);
          sendResponse({ success });
          break;
          
        case 'deleteTweet':
          await tweetStorage.init();
          const deleted = await tweetStorage.deleteTweet(request.tweetId);
          sendResponse({ success: deleted });
          break;
          
        case 'isTweetSaved':
          await tweetStorage.init();
          const isSaved = await tweetStorage.isTweetSaved(request.tweetId);
          sendResponse({ isSaved });
          break;
          
        case 'getAllTweets':
          await tweetStorage.init();
          const tweets = await tweetStorage.getAllTweets();
          sendResponse({ tweets });
          break;
          
        case 'clearAll':
          await tweetStorage.init();
          const cleared = await tweetStorage.clearAll();
          sendResponse({ success: cleared });
          break;
          
        case 'getStorageUsage':
          await tweetStorage.init();
          const usage = await tweetStorage.getStorageUsageFormatted();
          sendResponse({ usage });
          break;
          
        case 'tweetSaved':
          console.log('推文已保存:', request.tweetId);
          sendResponse({ success: true });
          break;
          
        case 'refreshButtons':
          // 向所有X/Twitter标签页发送刷新请求
          chrome.tabs.query({ url: ['https://twitter.com/*', 'https://x.com/*'] }, (tabs) => {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, { action: 'refreshButtons' }).catch(() => {
                // 忽略错误（可能是content script未加载）
              });
            });
          });
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[X推文追踪器] Background 处理消息时出错:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true; // 保持消息通道开放
});

// 监听扩展安装
chrome.runtime.onInstalled.addListener(() => {
  console.log('X推文追踪器已安装');
  
  // 初始化 Chrome Storage
  tweetStorage.init().then(() => {
    console.log('[X推文追踪器] Background Chrome Storage 初始化成功');
  }).catch(error => {
    console.error('[X推文追踪器] Background Chrome Storage 初始化失败:', error);
  });
});

// 导出数据功能在popup.js中实现，不需要在这里处理

