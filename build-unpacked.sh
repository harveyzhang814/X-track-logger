#!/bin/bash
# 构建扩展目录，用于 Chrome「加载已解压的扩展程序」
# 输出到 dist/，保留目录不删除

set -e
cd "$(dirname "$0")"

VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
echo "构建 X推文追踪器 v${VERSION}（Load unpacked 用）..."

rm -rf dist
mkdir -p dist

echo "复制清单与入口..."
cp manifest.json dist/

echo "复制脚本与样式..."
for f in content.js background.js popup.js storage.js content.css popup.css popup.html; do
  [ -f "$f" ] && cp "$f" dist/ || true
done

if [ -d icons ]; then
  echo "复制 icons/ ..."
  cp -r icons dist/
else
  echo "⚠️  未找到 icons/，请将 16/48/128 图标放入 icons/ 后重新构建"
fi

if [ -d libs ]; then
  echo "复制 libs/ ..."
  cp -r libs dist/
fi

echo ""
echo "✅ 构建完成: dist/"
echo ""
echo "在 Chrome 中加载："
echo "  1. 打开 chrome://extensions/"
echo "  2. 开启右上角「开发者模式」"
echo "  3. 点击「加载已解压的扩展程序」"
echo "  4. 选择本项目的 dist 目录"
echo ""
