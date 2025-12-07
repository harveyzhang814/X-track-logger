# X推文追踪器

<div align="center">

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow.svg)

一个强大的Chrome浏览器扩展，帮助您轻松保存和管理X（Twitter）上的重要推文。

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [开发](#-开发) • [贡献](#-贡献)

</div>

---

## 📖 简介

**X推文追踪器**是一个开源的Chrome浏览器扩展，让您可以方便地保存和管理X（Twitter）上的推文、回复、转推和引用推文。所有数据都存储在本地，完全保护您的隐私。

### ✨ 为什么选择X推文追踪器？

- 🔒 **完全隐私**：所有数据仅存储在您的浏览器本地，不会上传到任何服务器
- 🎯 **简单易用**：一键保存，无需复杂操作
- 📦 **完整信息**：保存推文文本、作者、日期、链接等完整信息
- 🔄 **智能同步**：自动检测新推文，支持多种刷新方式
- 📤 **数据导出**：支持导出为JSON格式，方便备份和迁移
- 🎨 **美观界面**：现代化的UI设计，使用体验流畅

## 🚀 功能特性

- ✅ **保存推文**：在X网页上直接点击"保存"按钮即可保存推文
- ✅ **支持多种类型**：支持保存推文、回复、转推（repost）和引用推文（quote）
- ✅ **完整信息**：保存推文文本、作者、日期、链接等完整信息
- ✅ **本地存储**：所有数据保存在浏览器本地，保护隐私
- ✅ **查看管理**：通过扩展popup界面查看、搜索和管理已保存的推文
- ✅ **数据导出**：支持导出所有保存的推文为JSON格式备份
- ✅ **动态检测**：自动检测页面中新加载的推文并添加保存按钮
- ✅ **悬浮刷新按钮**：网页右上角悬浮窗，一键刷新所有保存按钮
- ✅ **智能刷新**：支持在popup中刷新按钮，无需刷新整个网页

## 📦 快速开始

### 安装方式

#### 方式一：从源码安装（推荐开发者）

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/X_tracker.git
   cd X_tracker
   ```

2. **加载扩展**
   - 打开Chrome浏览器，访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

3. **开始使用**
   - 访问 [X.com](https://x.com) 或 [Twitter.com](https://twitter.com)
   - 在推文旁边找到蓝色的"保存"按钮
   - 点击即可保存推文

#### 方式二：从Chrome Web Store安装（即将推出）

扩展正在审核中，敬请期待！

#### 方式三：从GitHub Releases安装

1. 访问 [Releases页面](https://github.com/yourusername/X_tracker/releases)
2. 下载最新版本的 `.crx` 文件
3. 将文件拖拽到 `chrome://extensions/` 页面完成安装

## 📖 使用指南

### 保存推文

1. 打开 [X.com](https://x.com) 或 [Twitter.com](https://twitter.com)
2. 浏览推文时，每条推文旁边会出现一个蓝色的"保存"按钮 ⭐
3. 点击"保存"按钮即可保存该推文
4. 保存成功后，按钮会变为绿色的"已保存"状态 ✅

### 查看已保存的推文

1. 点击浏览器工具栏中的扩展图标
2. 在popup窗口中查看所有已保存的推文
3. 可以按类型筛选（全部/推文/回复/转推/引用）
4. 点击推文可以打开原始推文链接
5. 可以复制链接或删除已保存的推文

### 刷新保存按钮

如果保存按钮没有显示或消失，有两种方式刷新：

1. **使用悬浮窗刷新**（推荐）：
   - 在X网页右上角会显示一个蓝色圆形刷新按钮
   - 点击该按钮即可刷新所有保存按钮
   - 刷新时会显示加载动画和提示消息

2. **使用popup刷新**：
   - 点击扩展图标打开popup窗口
   - 点击右上角的刷新按钮（圆形箭头图标）
   - 所有X网页标签页的保存按钮都会刷新

### 导出数据

1. 在popup窗口中点击右上角的导出按钮
2. 选择保存位置
3. 数据将以JSON格式导出，包含所有推文信息

### 清空数据

1. 在popup窗口中点击右上角的清空按钮
2. 确认后即可清空所有已保存的推文

## 🛠️ 技术实现

### 技术栈

- **Manifest V3**：使用最新的Chrome扩展API
- **Content Script**：注入到X网页，提取推文信息并添加保存按钮
- **MutationObserver**：监听DOM变化，自动为新加载的推文添加保存按钮
- **Chrome Storage API**：使用 `chrome.storage.local` 本地存储数据
- **消息传递**：Content Script、Popup和Background Service Worker之间通过消息传递通信
- **事件监听**：监听`popstate`和`pageshow`事件，处理浏览器前进/后退时的按钮刷新

### 项目结构

```
X_tracker/
├── manifest.json          # 扩展配置文件（包含固定扩展ID）
├── content.js            # 内容脚本（注入到X网页，处理推文提取和按钮添加）
├── content.css           # 内容脚本样式（保存按钮和悬浮窗样式）
├── background.js         # 后台服务工作者（处理消息传递和存储操作）
├── storage.js            # 存储管理模块（封装Chrome Storage操作）
├── popup.html            # Popup界面HTML
├── popup.css             # Popup界面样式
├── popup.js              # Popup界面逻辑（显示和管理已保存的推文）
├── icons/                # 扩展图标
│   ├── tagged_bookmark 16px.png
│   ├── tagged_bookmark 48px.png
│   └── tagged_bookmark 128px.png
├── LICENSE               # Apache License 2.0
└── README.md             # 说明文档
```

### 数据格式

保存的推文数据格式如下：

```json
{
  "tweetId": {
    "id": "推文ID",
    "text": "推文文本内容",
    "author": {
      "name": "作者名称",
      "handle": "作者用户名"
    },
    "date": "ISO日期格式",
    "dateText": "显示的日期文本",
    "link": "推文链接",
    "type": "tweet|reply|repost|quote",
    "originalAuthor": "原始作者（如果是转推）",
    "quotedTweet": {
      "text": "被引用的推文文本（如果是引用推文）",
      "author": {
        "name": "被引用推文的作者名称",
        "handle": "被引用推文的作者用户名"
      },
      "link": "被引用推文的链接"
    },
    "hasMedia": true/false,
    "savedAt": "保存时间（ISO格式）"
  }
}
```

### 存储方案

扩展使用 **Chrome Storage Local API** 作为存储方案：

- **存储类型**：`chrome.storage.local`
- **容量限制**：10MB（通常可存储数千到上万条推文）
- **数据持久性**：使用固定的扩展ID（通过manifest.json中的key字段），确保重新安装扩展后数据不丢失
- **监控**：在popup界面中会显示当前存储使用量，方便监控

## 🔧 开发

### 环境要求

- Chrome浏览器（推荐最新版本）
- 基本的JavaScript和HTML知识

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/X_tracker.git
   cd X_tracker
   ```

2. **加载扩展**
   - 打开 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目目录

3. **修改代码**
   - 修改代码后，在扩展管理页面点击刷新按钮
   - 或重新加载扩展以应用更改

### 调试方法

1. **Content Script调试**：
   - 在X网页上按F12打开开发者工具
   - 查看Console中的日志（前缀：`[X推文追踪器]`）

2. **Background Service Worker调试**：
   - 在扩展管理页面点击"检查视图" → "service worker"
   - 查看Console中的日志

3. **Popup调试**：
   - 右键点击扩展图标 → "检查弹出内容"
   - 或打开popup后按F12

### 修改推文选择器

如果X网站更新导致无法识别推文，需要修改 `content.js` 中的选择器：

- 推文容器：`article[data-testid="tweet"]`
- 推文文本：`[data-testid="tweetText"]`
- 作者信息：`[data-testid="User-Name"]`
- 时间戳：`time`
- 推文链接：`a[href*="/status/"]`

### 打包扩展

使用项目提供的打包脚本：

```bash
chmod +x package.sh
./package.sh
```

这会生成一个 `.zip` 文件，可用于发布到Chrome Web Store。

## 🤝 贡献

我们欢迎所有形式的贡献！无论是报告bug、提出功能建议，还是提交代码，都非常感谢。

### 如何贡献

1. **Fork 本仓库**
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request**

### 贡献指南

- 请确保代码遵循项目的代码风格
- 提交前请测试您的更改
- 更新相关文档（如README）
- 提交信息请使用清晰的描述

## ❓ 常见问题

### Q: 保存的推文会占用多少存储空间？

A: Chrome Storage Local有10MB的限制，通常可以存储数千到上万条推文。您可以在popup界面中查看当前存储使用量。

### Q: 重新安装扩展后数据会丢失吗？

A: 不会。扩展使用固定的扩展ID，确保重新安装后数据不会丢失。

### Q: 数据会上传到服务器吗？

A: 不会。所有数据仅存储在您的浏览器本地，完全保护您的隐私。

### Q: 支持其他浏览器吗？

A: 目前仅支持Chrome浏览器。未来可能会支持其他基于Chromium的浏览器（如Edge、Brave等）。

### Q: 保存按钮没有显示怎么办？

A: 可以使用悬浮窗刷新按钮或popup中的刷新按钮来重新加载保存按钮。如果问题持续，请检查浏览器控制台是否有错误信息。

### Q: 如何备份我的数据？

A: 使用popup中的导出功能，可以将所有保存的推文导出为JSON格式文件。

## ⚠️ 注意事项

1. **数据存储**：所有数据存储在浏览器本地，清除浏览器数据会丢失保存的推文
2. **定期备份**：建议定期使用导出功能备份数据
3. **存储容量**：Chrome Storage Local有10MB限制，建议定期导出备份
4. **X网站更新**：如果X网站更新了DOM结构，可能需要更新选择器
5. **隐私保护**：所有数据仅存储在本地，不会上传到任何服务器

## 📝 更新日志

### v1.0.0 (2024-12)

**MVP版本发布**

- ✨ 初始版本发布
- ✨ 支持保存推文、回复、转推和引用推文
- ✨ 支持查看、导出和删除已保存的推文
- ✨ 支持按类型筛选推文
- ✨ 使用Chrome Storage Local作为存储方案
- ✨ 添加固定扩展ID，确保重新安装后数据不丢失
- ✨ 添加悬浮刷新按钮（网页右上角）
- ✨ 添加popup刷新按钮功能
- ✨ 支持浏览器前进/后退时自动刷新保存按钮
- 🐛 优化保存按钮的显示逻辑，防止重复按钮
- 🐛 改进推文信息提取，支持更完整的引用推文信息

查看完整的 [更新日志](CHANGELOG.md)（即将推出）

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。

Copyright 2024 X Tracker Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied.
See the License for the specific language governing permissions and
limitations under the License.

## 🙏 致谢

- 感谢所有贡献者的支持
- 感谢使用本扩展的用户

## 📮 联系方式

- **问题反馈**：[GitHub Issues](https://github.com/yourusername/X_tracker/issues)
- **功能建议**：[GitHub Discussions](https://github.com/yourusername/X_tracker/discussions)

---

<div align="center">

**如果这个项目对您有帮助，请给个 ⭐ Star！**

Made with ❤️ by X Tracker Contributors

</div>
