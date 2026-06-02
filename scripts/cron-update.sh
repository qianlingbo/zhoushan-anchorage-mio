#!/bin/bash
# ─────────────────────────────────────────────
# 舟山锚地 MIO 数据定时更新脚本
# 专为 cron 环境设计，解决所有环境差异问题
# ─────────────────────────────────────────────

set -euo pipefail

# ── 1. 固定 PATH（cron 环境极简，手动补全） ──
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# ── 2. 代理设置（如果 Clash Verge 开启了代理，此配置确保走代理访问） ──
# 如果系统中没有代理软件在运行，注释或删除下面两行即可
export http_proxy="http://127.0.0.1:7897"
export https_proxy="http://127.0.0.1:7897"
export ALL_PROXY="http://127.0.0.1:7897"

# ── 3. 固定项目路径 ──
# 实际路径：/Users/qianlingbo/Documents/New project 7/zhoushan-anchorage-mio
# 如果项目迁移了，改这里
PROJECT_DIR="/Users/qianlingbo/Documents/New project 7/zhoushan-anchorage-mio"
LOG_FILE="/tmp/mio-update.log"

# ── 4. 写日志函数 ──
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ── 5. 进入项目目录 ──
if ! cd "$PROJECT_DIR" 2>/dev/null; then
  log "❌ 无法进入目录 $PROJECT_DIR"
  exit 1
fi

log "── 开始更新 ──"

# ── 6. 拉取最新远程数据（避免推时冲突） ──
/usr/bin/git pull --rebase >> "$LOG_FILE" 2>&1 || log "⚠️ git pull 失败（可能首次或无网络）"

# ── 7. 抓取数据（--skip-current-window 防止同窗口重复抓） ──
if /usr/bin/python3 scripts/update_data.py --skip-current-window >> "$LOG_FILE" 2>&1; then
  log "✅ 数据抓取成功"
elif /usr/bin/python3 scripts/update_data.py --cache-only >> "$LOG_FILE" 2>&1; then
  log "ℹ️ 数据源不可用，沿用上次数据"
else
  log "❌ 数据抓取失败，退出"
  exit 1
fi

# ── 8. git 提交 ──
/usr/bin/git add data/

if /usr/bin/git diff --cached --quiet; then
  log "ℹ️ 数据无变化，跳过推送"
  exit 0
fi

COMMIT_MSG="🔄 更新MIO数据 $(date '+%Y-%m-%d %H:%M')"
/usr/bin/git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1
log "✅ git commit 完成"

# ── 9. git push（带重试） ──
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
