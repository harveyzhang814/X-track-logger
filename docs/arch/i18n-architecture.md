# i18n 架构总结

> **实现状态（2026-02-21）**：本文档原描述基于 **i18next + react-i18next** 的 React 方案（规划稿）。当前项目为纯 Vanilla JS Chrome 扩展，已在 `fea-i8n` 分支上以 **Chrome 原生 `chrome.i18n` API** 完成等价实现，详见下方「Vanilla JS 实现对照」章节。

> **可移植性说明**：本文档描述的方案基于 **i18next + react-i18next**，与宿主环境（Chrome 扩展、Web 应用、Electron 等）解耦。除「持久化存储」一节外，所有设计决策均可直接迁移到任意 React 项目，无需修改翻译文件或核心逻辑。

---

## 目录

1. [技术选型](#技术选型)
2. [目录结构](#目录结构)
3. [核心模块](#核心模块)
4. [数据流](#数据流)
5. [构建时 vs 运行时](#构建时-vs-运行时)
6. [语言切换机制](#语言切换机制)
7. [组件集成模式](#组件集成模式)
8. [添加新语言（SOP）](#添加新语言sop)
9. [已知限制与取舍](#已知限制与取舍)
10. [可移植性指南](#可移植性指南)

---

## 技术选型

| 依赖 | 版本 | 职责 |
|------|------|------|
| `i18next` | ^25.7.4 | 核心翻译引擎：资源管理、插值、fallback |
| `react-i18next` | ^16.5.3 | React 绑定：`useTranslation` hook、`I18nextProvider` |

**不使用** Chrome 原生 `chrome.i18n` API（需要 `_locales/` 目录），原因：

- Chrome i18n API 仅在扩展上下文可用，无法在普通 Web 页面或测试环境中运行
- i18next 提供更丰富的插值、复数、命名空间等能力
- 与宿主环境解耦，迁移成本低

---

## 目录结构

```
src/i18n/
├── config.ts                   # i18next 初始化 + changeLanguage()
├── locales.ts                  # 支持语言注册表 + 浏览器语言检测
└── locales/
    ├── en/
    │   └── translation.json    # 英文翻译（~345 个键）
    └── zh-CN/
        └── translation.json    # 简体中文翻译（~345 个键）
```

所有翻译使用单一命名空间 `translation`（i18next 默认值），无需多命名空间拆分。

---

## 核心模块

### `locales.ts` — 语言注册表（唯一配置源）

```typescript
export const SUPPORTED_LOCALES = {
  'zh-CN': { code: 'zh-CN', name: '中文 (简体)', nativeName: '中文 (简体)' },
  'en':    { code: 'en',    name: 'English',     nativeName: 'English'     },
} as const;

export type Locale = keyof typeof SUPPORTED_LOCALES;  // 自动推导，无需手动维护
export const DEFAULT_LOCALE: Locale = 'zh-CN';
export const LOCALE_CODES = Object.keys(SUPPORTED_LOCALES) as Locale[];
```

**设计原则**：单一配置源（Single Source of Truth）。`Locale` 类型、UI 选项列表、fallback 逻辑均从此对象自动派生，添加新语言只需在此处追加一项。

---

### `config.ts` — i18next 初始化

```typescript
import zhCNTranslations from './locales/zh-CN/translation.json';
import enTranslations   from './locales/en/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      [DEFAULT_LOCALE]: { translation: zhCNTranslations },
      'en':             { translation: enTranslations   },
    },
    lng: DEFAULT_LOCALE,       // 同步默认值，防止首帧空白
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },  // React 已转义
  });
```

初始化为**同步**，所有翻译包在构建时打包进 bundle，无网络请求。

---

### `translation.json` — 翻译键结构

翻译键按功能模块分层，格式为 `{模块}.{子模块?}.{键}`：

```
app            → 应用级（标题、名称）
common         → 通用操作（save、cancel、delete …）
navigation     → 导航栏
bookmark       → 书签管理
tag            → 标签管理
workstation    → 工作台
homepage       → 首页
globalSearch   → 全局搜索
ranking        → 排行
settings       → 设置
importExport   → 导入导出
chromeSync     → Chrome 同步
sort           → 排序
pagination     → 分页
popup          → 弹出窗口
tooltip        → 提示文字
theme          → 主题
```

---

## 数据流

```
应用启动
  │
  ├─ [同步] i18next.init(lng: DEFAULT_LOCALE)
  │         └─ 首帧使用 zh-CN 渲染，防止空白
  │
  └─ [异步] initLocale()
            ├─ 读取 chrome.storage.local['tbm.locale']
            ├─ 若不存在（首次启动）→ detectBrowserLocale()
            │     └─ 遍历 navigator.languages，前缀匹配 SUPPORTED_LOCALES
            └─ i18n.changeLanguage(locale) → 触发全局重渲染

用户切换语言（SettingsPage）
  │
  ├─ setCurrentLocale(locale)        // 本地 state
  ├─ saveLocale(locale)              // 写入 chrome.storage.local
  └─ changeLanguage(locale)          // i18n.changeLanguage → 全局重渲染
```

---

## 构建时 vs 运行时

| 阶段 | 内容 | 说明 |
|------|------|------|
| **构建时** | 翻译 JSON 打包进 bundle | 静态 import，无懒加载，bundle 体积略增但零网络延迟 |
| **运行时（启动）** | 读取用户语言偏好 | 异步，有短暂 zh-CN → 目标语言的切换闪烁（已知取舍） |
| **运行时（交互）** | 语言切换 + 持久化 | 同步切换 UI，异步写入 storage |

---

## 语言切换机制

### 浏览器语言自动检测（首次启动）

`detectBrowserLocale()` 遍历 `navigator.languages`，按以下优先级匹配：

1. **精确匹配**：`zh-CN` → `zh-CN`，`en-US` → `en`
2. **前缀匹配**：`zh-TW`、`zh-HK`、`zh-SG` → `zh-CN`；`en-*` → `en`
3. **兜底**：`DEFAULT_LOCALE`（`zh-CN`）

### 持久化

语言偏好存储于 `chrome.storage.local`，键名 `tbm.locale`，由 `src/lib/storage.ts` 统一管理。

---

## 组件集成模式

### 入口包装

每个 React 应用入口（Popup、Options）均用 `I18nextProvider` 包裹根组件：

```tsx
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);
```

### 组件内使用

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  return (
    <>
      <h1>{t('app.title')}</h1>
      <span>{t('pagination.page', { page: 1 })}</span>  {/* 插值 */}
    </>
  );
};
```

### 非组件上下文

```typescript
import i18n from '../i18n/config';
const msg = i18n.t('common.save');
```

---

## 添加新语言（SOP）

以添加日语（`ja`）为例，共 **3 个文件**需要修改：

**① `src/i18n/locales.ts`**

```typescript
export const SUPPORTED_LOCALES = {
  'zh-CN': { ... },
  'en':    { ... },
  'ja':    { code: 'ja', name: '日本語', nativeName: '日本語' },  // 新增
} as const;
```

完成后，`Locale` 类型、`LOCALE_CODES`、Settings 页面的语言选项列表**自动更新**。

**② 创建翻译文件**

```
src/i18n/locales/ja/translation.json
```

复制 `en/translation.json`，翻译所有值。

**③ `src/i18n/config.ts`**

```typescript
import jaTranslations from './locales/ja/translation.json';

i18n.init({
  resources: {
    ...
    'ja': { translation: jaTranslations },
  },
});
```

**验证**：`npm run build` + `npx tsc --noEmit`

---

## 已知限制与取舍

| 限制 | 原因 | 现有缓解方案 |
|------|------|-------------|
| Background Service Worker 无法使用 react-i18next | 缺少 DOM 环境 | Background 脚本中文本硬编码，或使用 `chrome.i18n` |
| 首次渲染短暂闪烁（zh-CN → 用户语言） | 同步 init + 异步 storage 读取的固有时序差 | 可接受；如需消除可改为异步 init |
| 所有语言包随 bundle 加载 | 静态 import | 语言数量少时可接受；语言多时可改为动态 `import()` |

---

## 可移植性指南

本方案的宿主环境耦合点**仅有一处**：`src/lib/storage.ts` 中的 `chrome.storage.local`。

迁移到其他宿主环境时，只需替换以下三个函数的实现，**其余所有代码无需改动**：

| 函数 | Chrome 扩展实现 | Web 应用替换方案 | Electron 替换方案 |
|------|----------------|-----------------|------------------|
| `getLocale()` | `chrome.storage.local.get` | `localStorage.getItem` | `electron-store` |
| `saveLocale()` | `chrome.storage.local.set` | `localStorage.setItem` | `electron-store` |
| `isFirstLaunch()` | 检查 `tbm.locale` 是否存在 | 同左 | 同左 |

### 迁移清单

- [ ] 替换 `src/lib/storage.ts` 中的 locale 读写实现
- [ ] 移除 `chrome.storage` 类型依赖（`@types/chrome`）
- [ ] 验证 `navigator.languages` 在目标环境可用（浏览器/Node.js 均支持）
- [ ] 构建工具确保 JSON 文件可被静态 import（Vite/Webpack 默认支持）
- [ ] 无需修改：`src/i18n/`、翻译文件、任何 React 组件

---

## Vanilla JS 实现对照

> 本节记录当前项目（纯 Vanilla JS Chrome 扩展）的实际实现，与上方 React 方案的等价关系。

### 技术选型差异

| 方案 | React 规划稿 | 当前 Vanilla JS 实现 |
|------|-------------|---------------------|
| 翻译引擎 | `i18next` | Chrome 原生 `chrome.i18n` API |
| 翻译文件路径 | `src/i18n/locales/*/translation.json` | `_locales/*/messages.json` |
| 初始化 | `i18n.init()` + `I18nextProvider` | `initI18n()` 遍历 `data-i18n` 属性 |
| 组件内调用 | `useTranslation()` hook + `t('key')` | `chrome.i18n.getMessage('key')` |
| 语言自动检测 | `detectBrowserLocale()` | Chrome 原生处理，无需额外代码 |
| 持久化 | `chrome.storage.local['tbm.locale']` | Chrome 原生处理 |

### 实现文件清单

```
_locales/
├── zh_CN/
│   └── messages.json    # 65 个翻译键（默认语言）
└── en/
    └── messages.json    # 65 个翻译键（英文）
```

修改文件：`manifest.json`、`popup.html`、`popup.js`、`content.js`、`build-unpacked.sh`

### `initI18n()` 模式（等价于 `useTranslation` hook）

```javascript
const i18n = (key, ...subs) => chrome.i18n.getMessage(key, subs);

function initI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = i18n(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = i18n(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = i18n(el.dataset.i18nPlaceholder);
  });
}
```

### 翻译键命名规范

```
app_*        → 扩展名称与描述（manifest 使用）
popup_*      → Popup UI 文本
settings_*   → 设置面板标签
shortcut_*   → 快捷键相关文本
toast_*      → 操作反馈 toast
confirm_*    → confirm() 对话框
tweet_*      → 片段卡片按钮
content_*    → Content Script 通知与按钮
```

---

*文档生成时间：2026-02-21 | 对应代码版本：staging 分支*
*Vanilla JS 实现章节更新时间：2026-02-21 | 对应分支：fea-i8n*
