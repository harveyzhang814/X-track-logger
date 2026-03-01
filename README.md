# FigClip

<div align="center">

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow.svg)

一款轻量级 Chrome 扩展，用于在网页浏览时一键嵌入并本地保存文本片段，所有数据完全存储在浏览器本地。

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [开发](#-开发) • [贡献](#-贡献)

</div>

---

## 📖 简介

**FigClip** 是一个开源的 Chrome 浏览器扩展，专注于**嵌入式文本记录**：在网页浏览过程中，一键将感兴趣的内容片段（帖子、回复、引用、转发等）保存到本地。所有数据仅存储在您的浏览器中，完全离线，不上传任何内容。

### ✨ 为什么选择 FigClip？

- 🔒 **完全本地**：所有数据仅存储在您的浏览器本地，不会上传到任何服务器
- 🎯 **一键保存**：点击即保存，无需复杂操作
- 📦 **完整信息**：保存文本内容、作者、日期、链接等完整元数据
- 🔄 **动态检测**：自动检测新加载的内容，支持多种刷新方式
- 📤 **数据导出**：支持导出为 JSON 格式，方便备份和迁移
- 🎨 **简洁界面**：现代化 UI 设计，使用体验流畅

## 🚀 功能特性

- ✅ **保存片段**：在网页上直接点击"保存"按钮即可保存内容片段
- ✅ **支持多种类型**：支持保存帖子（Post）、回复（Reply）、转发（Repost）和引用（Quote）
- ✅ **完整元数据**：保存文本内容、作者、日期、链接等完整信息
- ✅ **本地存储**：所有数据保存在浏览器本地，保护隐私
- ✅ **查看管理**：通过扩展 popup 界面查看、筛选和管理已保存的片段
- ✅ **数据导出**：支持导出所有保存的片段为 JSON 格式备份
- ✅ **动态检测**：自动检测页面中新加载的内容并添加保存按钮
- ✅ **悬浮刷新按钮**：网页右上角悬浮窗，一键刷新所有保存按钮
- ✅ **智能刷新**：支持在 popup 中刷新按钮，无需刷新整个网页
- ✅ **键盘快捷键**：支持自定义快捷键，快速保存/移除焦点内容

## 📦 快速开始

### 安装方式

#### 方式一：从源码安装（推荐开发者）

1. **克隆仓库**
   ```bash
   git clone https://github.com/harveyzhang814/figclip.git
   cd figclip
   ```

2. **构建（用于「加载已解压的扩展程序」）**
   ```bash
   ./build-unpacked.sh
   ```
   会生成 `dist/` 目录，仅包含扩展所需文件，适合直接加载。

3. **加载扩展**
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 **`dist`** 目录（若未构建则选项目根目录）

4. **开始使用**
   - 访问支持的网页
   - 在内容旁边找到蓝色的"保存"按钮
   - 点击即可保存片段

#### 方式二：从 Chrome Web Store 安装（即将推出）

扩展正在审核中，敬请期待！

#### 方式三：从 GitHub Releases 安装

1. 访问 [Releases 页面](https://github.com/harveyzhang814/figclip/releases)
2. 下载最新版本的 `.crx` 文件
3. 将文件拖拽到 `chrome://extensions/` 页面完成安装

## 📖 使用指南

### 保存片段

1. 打开支持的网页
2. 浏览内容时，每条内容旁边会出现一个蓝色的"保存"按钮 ⭐
3. 点击"保存"按钮即可保存该片段
4. 保存成功后，按钮会变为绿色的"已保存"状态 ✅

### 查看已保存的片段

1. 点击浏览器工具栏中的扩展图标
2. 在 popup 窗口中查看所有已保存的片段
3. 可以按类型筛选（全部 / 帖子 / 回复 / 转发 / 引用）
4. 点击片段可以打开原始链接
5. 可以复制链接或删除已保存的片段

### 刷新保存按钮

如果保存按钮没有显示或消失，有两种方式刷新：

1. **使用悬浮窗刷新**（推荐）：
   - 在网页右上角会显示一个蓝色圆形刷新按钮
   - 点击该按钮即可刷新所有保存按钮
   - 刷新时会显示加载动画和提示消息

2. **使用 popup 刷新**：
   - 点击扩展图标打开 popup 窗口
   - 点击右上角的刷新按钮（圆形箭头图标）
   - 所有已打开标签页的保存按钮都会刷新

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+S` | 保存当前焦点（鼠标悬停）内容 |
| `Ctrl+Shift+D` | 移除当前焦点内容的保存记录 |
| `Ctrl+Shift+T` | 重新判断当前焦点内容的类型 |

所有快捷键均可在设置面板中自定义。

### 导出数据

1. 在 popup 窗口中点击右上角的导出按钮
2. 选择保存位置
3. 数据将以 JSON 格式导出，包含所有片段信息

### 清空数据

1. 在 popup 窗口中点击右上角的清空按钮
2. 确认后即可清空所有已保存的片段

## 🛠️ 技术实现

### 技术栈

- **Manifest V3**：使用最新的 Chrome 扩展 API
- **Content Script**：注入到网页，提取内容信息并添加保存按钮
- **MutationObserver**：监听 DOM 变化，自动为新加载的内容添加保存按钮
- **Chrome Storage API**：使用 `chrome.storage.local` 本地存储数据
- **消息传递**：Content Script、Popup 和 Background Service Worker 之间通过消息传递通信
- **事件监听**：监听 `popstate` 和 `pageshow` 事件，处理浏览器前进/后退时的按钮刷新

### 项目结构

```
figclip/
├── manifest.json          # 扩展配置文件（包含固定扩展 ID）
├── content.js             # 内容脚本（注入到网页，处理内容提取和按钮添加）
├── content.css            # 内容脚本样式（保存按钮和悬浮窗样式）
├── background.js          # 后台服务工作者（处理消息传递和存储操作）
├── storage.js             # 存储管理模块（封装 Chrome Storage 操作）
├── popup.html             # Popup 界面 HTML
├── popup.css              # Popup 界面样式
├── popup.js               # Popup 界面逻辑（显示和管理已保存的片段）
├── icons/                 # 扩展图标
│   ├── tagged_bookmark 16px.png
│   ├── tagged_bookmark 48px.png
│   └── tagged_bookmark 128px.png
├── LICENSE                # Apache License 2.0
└── README.md              # 说明文档
```

### 数据格式

保存的片段数据格式如下：

```json
{
  "itemId": {
    "id": "片段 ID",
    "text": "文本内容",
    "author": {
      "name": "作者名称",
      "handle": "作者用户名"
    },
    "date": "ISO 日期格式",
    "dateText": "显示的日期文本",
    "link": "原始链接",
    "type": "tweet|reply|repost|quote",
    "originalAuthor": "原始作者（如果是转发）",
    "quotedTweet": {
      "text": "被引用的文本（如果是引用）",
      "author": {
        "name": "被引用内容的作者名称",
        "handle": "被引用内容的作者用户名"
      },
      "link": "被引用内容的链接"
    },
    "hasMedia": true,
    "savedAt": "保存时间（ISO 格式）"
  }
}
```

### 存储方案

扩展使用 **Chrome Storage Local API** 作为存储方案：

- **存储类型**：`chrome.storage.local`
- **容量限制**：10MB（通常可存储数千到上万条片段）
- **数据持久性**：使用固定的扩展 ID（通过 manifest.json 中的 key 字段），确保重新安装扩展后数据不丢失
- **监控**：在 popup 界面中会显示当前存储使用量，方便监控

## 🔧 开发

### 环境要求

- Chrome 浏览器（推荐最新版本）
- 基本的 JavaScript 和 HTML 知识

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/harveyzhang814/figclip.git
   cd figclip
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

1. **Content Script 调试**：
   - 在网页上按 F12 打开开发者工具
   - 查看 Console 中的日志（前缀：`[FigClip]`）

2. **Background Service Worker 调试**：
   - 在扩展管理页面点击"检查视图" → "service worker"
   - 查看 Console 中的日志

3. **Popup 调试**：
   - 右键点击扩展图标 → "检查弹出内容"
   - 或打开 popup 后按 F12

### 打包扩展

使用项目提供的打包脚本：

```bash
chmod +x package.sh
./package.sh
```

这会生成一个 `.zip` 文件，可用于发布到 Chrome Web Store。

## 🤝 贡献

我们欢迎所有形式的贡献！无论是报告 bug、提出功能建议，还是提交代码，都非常感谢。

### 如何贡献

1. **Fork 本仓库**
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request**

### 贡献指南

- 请确保代码遵循项目的代码风格
- 提交前请测试您的更改
- 更新相关文档（如 README）
- 提交信息请使用清晰的描述

## ❓ 常见问题

### Q: 保存的片段会占用多少存储空间？

A: Chrome Storage Local 有 10MB 的限制，通常可以存储数千到上万条片段。您可以在 popup 界面中查看当前存储使用量。

### Q: 重新安装扩展后数据会丢失吗？

A: 不会。扩展使用固定的扩展 ID，确保重新安装后数据不会丢失。

### Q: 数据会上传到服务器吗？

A: 不会。所有数据仅存储在您的浏览器本地，完全保护您的隐私。

### Q: 支持其他浏览器吗？

A: 目前仅支持 Chrome 浏览器。未来可能会支持其他基于 Chromium 的浏览器（如 Edge、Brave 等）。

### Q: 保存按钮没有显示怎么办？

A: 可以使用悬浮窗刷新按钮或 popup 中的刷新按钮来重新加载保存按钮。如果问题持续，请检查浏览器控制台是否有错误信息。

### Q: 内容类型（帖子/回复/转发/引用）显示不对怎么办？

A: 类型是根据页面 DOM 和文案自动识别的，网站改版或语言不同可能导致误判。若发现类型错误，反馈时请说明：页面场景、您认为的正确类型、以及界面语言，便于我们迭代规则。详见 [故障排查指南](TROUBLESHOOTING.md) 与 [逻辑说明](docs/逻辑说明.md)。

### Q: 加载扩展时提示 "This extension includes the key file... private_key.pem"？

A: 私钥文件不应放在扩展目录内。请将 `private_key.pem` 移到项目外再加载扩展，例如：
   ```bash
   mv /path/to/figclip/private_key.pem /path/to/
   ```
   扩展的稳定 ID 由 manifest 里的公钥决定，不依赖项目目录内是否有 .pem 文件。

### Q: 如何备份我的数据？

A: 使用 popup 中的导出功能，可以将所有保存的片段导出为 JSON 格式文件。

## ⚠️ 注意事项

1. **数据存储**：所有数据存储在浏览器本地，清除浏览器数据会丢失保存的片段
2. **定期备份**：建议定期使用导出功能备份数据
3. **存储容量**：Chrome Storage Local 有 10MB 限制，建议定期导出备份

## 📝 更新日志

### v1.0.0 (2024-12)

**MVP 版本发布**

- ✨ 初始版本发布
- ✨ 支持保存帖子、回复、转发和引用内容
- ✨ 支持查看、导出和删除已保存的片段
- ✨ 支持按类型筛选片段
- ✨ 使用 Chrome Storage Local 作为存储方案
- ✨ 添加固定扩展 ID，确保重新安装后数据不丢失
- ✨ 添加悬浮刷新按钮（网页右上角）
- ✨ 添加 popup 刷新按钮功能
- ✨ 支持浏览器前进/后退时自动刷新保存按钮
- ✨ 支持自定义键盘快捷键
- 🐛 优化保存按钮的显示逻辑，防止重复按钮
- 🐛 改进内容信息提取，支持更完整的引用内容信息

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。

Copyright 2024 FigClip Contributors

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

- **问题反馈**：[GitHub Issues](https://github.com/harveyzhang814/figclip/issues)
- **功能建议**：[GitHub Discussions](https://github.com/harveyzhang814/figclip/discussions)

---

<div align="center">

**如果这个项目对您有帮助，请给个 ⭐ Star！**

Made with ❤️ by FigClip Contributors

</div>
