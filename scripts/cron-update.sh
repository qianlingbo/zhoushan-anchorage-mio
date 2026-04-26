#!/bin/bash
# ─────────────────────────────────────────────
# 舟山锚地 MIO 数据定时更新脚本
# 专为 cron 环境设计，解决所有环境差异问题
# ─────────────────────────────────────────────

set -euo pipefail

# ── 1. 固定 PATH（cron 环境极简，手动补全） ──
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# ── 2. 固定项目路径 ──
PROJECT_DIR="$HOME/zhoushan-mio"
LOG_FILE="/tmp/mio-update.log"

# ── 3. 写日志函数 ──
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ── 4. 进入项目目录 ──
if ! cd "$PROJECT_DIR" 2>/dev/null; then
  log "❌ 无法进入目录 $PROJECT_DIR"
  exit 1
fi

log "── 开始更新 ──"

# ── 5. 抓取数据 ──
if /usr/bin/python3 scripts/update_data.py >> "$LOG_FILE" 2>&1; then
  log "✅ 数据抓取成功"
else
  log "❌ 数据抓取失败，退出"
  exit 1
fi

# ── 6. git 提交 ──
/usr/bin/git add data/

if /usr/bin/git diff --cached --quiet; then
  log "ℹ️ 数据无变化，跳过推送"
  exit 0
fi

COMMIT_MSG="🔄 更新MIO数据 $(date '+%Y-%m-%d %H:%M')"
/usr/bin/git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1
log "✅ git commit 完成"

# ── 7. git push（带重试） ──
MAX_RETRIES=3
for i in $(seq 1 $MAX_RETRIES); do
  if /usr/bin/git push >> "$LOG_FILE" 2>&1; then
    log "✅ git push 成功"
    exit 0
  else
    log "⚠️ git push 失败（第 ${i}/${MAX_RETRIES} 次）"
    if [ $i -lt $MAX_RETRIES ]; then
      # 可能是远程有新提交，先 pull rebase
      /usr/bin/git pull --rebase >> "$LOG_FILE" 2>&1 || true
      sleep 5
    fi
  fi
done

log "❌ git push 连续 ${MAX_RETRIES} 次失败"
exit 1
