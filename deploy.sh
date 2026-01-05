#!/bin/bash

cd "$(dirname "$0")"

# 检查是否有更改
if git diff --quiet && git diff --cached --quiet; then
    echo "没有检测到更改，跳过部署"
    exit 0
fi

# 添加所有更改
git add .

# 获取提交信息（可选参数，默认为当前时间）
MSG="${1:-更新于 $(date '+%Y-%m-%d %H:%M:%S')}"

# 提交并推送
git commit -m "$MSG"
git push

echo "✅ 部署完成！"
echo "🌐 访问: https://vane2512.github.io/tools/"
