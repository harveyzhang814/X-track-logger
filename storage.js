// X推文追踪器 - 存储管理模块
// 使用 chrome.storage.local 作为存储方案，确保重新安装扩展后数据不丢失

class TweetStorage {
  constructor() {
    this.storageKey = 'savedTweets';
    this.initPromise = null;
  }

  // 初始化存储
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      // 检查 chrome.storage 是否可用
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        throw new Error('Chrome Storage API 不可用');
      }

      try {
        // 检查是否已有数据，如果没有则初始化
        const result = await chrome.storage.local.get([this.storageKey]);
        if (!result[this.storageKey]) {
          await chrome.storage.local.set({ [this.storageKey]: {} });
          console.log('[X推文追踪器] Chrome Storage 初始化成功（新建）');
        } else {
          console.log('[X推文追踪器] Chrome Storage 初始化成功（已有数据）');
        }
        return;
      } catch (error) {
        console.error('[X推文追踪器] Chrome Storage 初始化失败:', error);
        throw new Error(`Chrome Storage 初始化失败: ${error.message}`);
      }
    })();

    return this.initPromise;
  }

  // 获取所有推文
  async getAllTweets() {
    await this.init();

    return new Promise((resolve, reject) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[X推文追踪器] 读取 Chrome Storage 失败:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        const tweets = result[this.storageKey] || {};
        console.log(`[X推文追踪器] 从 Chrome Storage 加载了 ${Object.keys(tweets).length} 条推文`);
        resolve(tweets);
      });
    });
  }

  // 保存推文
  async saveTweet(tweetInfo) {
    await this.init();

    return new Promise((resolve, reject) => {
      // 先获取现有数据
      chrome.storage.local.get([this.storageKey], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[X推文追踪器] 读取 Chrome Storage 失败:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        const tweets = result[this.storageKey] || {};
        const existing = tweets[tweetInfo.id];
        tweets[tweetInfo.id] = existing ? { ...existing, ...tweetInfo } : tweetInfo;

        // 保存更新后的数据
        chrome.storage.local.set({ [this.storageKey]: tweets }, () => {
          if (chrome.runtime.lastError) {
            console.error('[X推文追踪器] 保存到 Chrome Storage 失败:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }

          console.log(`[X推文追踪器] 推文已保存到 Chrome Storage: ${tweetInfo.id}`);
          resolve(true);
        });
      });
    });
  }

  // 删除推文
  async deleteTweet(tweetId) {
    await this.init();

    return new Promise((resolve, reject) => {
      // 先获取现有数据
      chrome.storage.local.get([this.storageKey], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[X推文追踪器] 读取 Chrome Storage 失败:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        const tweets = result[this.storageKey] || {};
        delete tweets[tweetId];

        // 保存更新后的数据
        chrome.storage.local.set({ [this.storageKey]: tweets }, () => {
          if (chrome.runtime.lastError) {
            console.error('[X推文追踪器] 保存到 Chrome Storage 失败:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }

          resolve(true);
        });
      });
    });
  }

  // 检查推文是否已保存
  async isTweetSaved(tweetId) {
    await this.init();

    return new Promise((resolve, reject) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[X推文追踪器] 读取 Chrome Storage 失败:', chrome.runtime.lastError);
          resolve(false);
          return;
        }

        const tweets = result[this.storageKey] || {};
        resolve(tweetId in tweets);
      });
    });
  }

  // 获取存储使用量（字节）
  async getStorageUsage() {
    await this.init();

    return new Promise((resolve, reject) => {
      chrome.storage.local.getBytesInUse([this.storageKey], (bytes) => {
        if (chrome.runtime.lastError) {
          console.error('[X推文追踪器] 获取存储使用量失败:', chrome.runtime.lastError);
          // 如果获取失败，尝试手动计算
          chrome.storage.local.get([this.storageKey], (result) => {
            if (chrome.runtime.lastError) {
              resolve(0);
              return;
            }
            const data = JSON.stringify(result[this.storageKey] || {});
            resolve(new Blob([data]).size);
          });
          return;
        }
        resolve(bytes);
      });
    });
  }

  // 获取存储使用量（格式化）
  async getStorageUsageFormatted() {
    const bytes = await this.getStorageUsage();
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }


  // 清空所有数据
  async clearAll() {
    await this.init();

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.storageKey]: {} }, () => {
        if (chrome.runtime.lastError) {
          console.error('[X推文追踪器] 清空 Chrome Storage 失败:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        resolve(true);
      });
    });
  }
}

// 创建全局实例
const tweetStorage = new TweetStorage();

