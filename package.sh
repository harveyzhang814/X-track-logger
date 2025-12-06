#!/bin/bash
# 打包扩展为zip文件（用于Chrome Web Store）

VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
OUTPUT="x-tracker-v${VERSION}.zip"

echo "开始打包扩展 v${VERSION}..."

# 创建临时目录
mkdir -p dist

# 复制文件（排除不需要的文件）
echo "复制文件..."
cp manifest.json dist/
cp *.js dist/ 2>/dev/null || true
cp *.css dist/ 2>/dev/null || true
cp *.html dist/ 2>/dev/null || true
cp -r icons dist/ 2>/dev/null || true

# 打包
echo "创建zip文件..."
cd dist
zip -r "../${OUTPUT}" . -q
cd ..

# 清理
rm -rf dist

echo "✅ 打包完成: ${OUTPUT}"
echo "📦 文件大小: $(du -h ${OUTPUT} | cut -f1)"

