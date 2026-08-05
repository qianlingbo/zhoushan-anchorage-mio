#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="zhoushan-berth-window"
BASE_URL="${ZHOU_SHAN_BERTH_SKILL_BASE_URL:-https://www.zsagent01.com/kaobo}"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
SKILLS_DIR="$CODEX_HOME_DIR/skills"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$SKILLS_DIR"
curl -fsSL "$BASE_URL/$SKILL_NAME.zip" -o "$TMP_DIR/$SKILL_NAME.zip"
unzip -oq "$TMP_DIR/$SKILL_NAME.zip" -d "$SKILLS_DIR"
chmod +x "$SKILLS_DIR/$SKILL_NAME/scripts/calculate_berth_windows.py"

printf '已安装 %s 到 %s\n' "$SKILL_NAME" "$SKILLS_DIR/$SKILL_NAME"
printf '下一个 Codex 对话回合即可使用 $%s。\n' "$SKILL_NAME"
