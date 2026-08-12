#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="river-mud-channel-tide"
BASE_URL="${RIVER_MUD_TIDE_SKILL_BASE_URL:-https://www.zsagent01.com/tide}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

curl -fsSL "$BASE_URL/$SKILL_NAME.zip" -o "$TMP_DIR/$SKILL_NAME.zip"
unzip -oq "$TMP_DIR/$SKILL_NAME.zip" -d "$TMP_DIR/package"

if [ -n "${AGENT_SKILLS_DIR:-}" ]; then
  TARGETS=("$AGENT_SKILLS_DIR")
else
  TARGETS=(
    "$HOME/.agents/skills"
    "${CODEX_HOME:-$HOME/.codex}/skills"
    "${OPENCLAW_HOME:-$HOME/.openclaw}/skills"
    "${HERMES_HOME:-$HOME/.hermes}/skills"
  )
fi

for skills_dir in "${TARGETS[@]}"; do
  mkdir -p "$skills_dir"
  rm -rf "$skills_dir/$SKILL_NAME"
  cp -R "$TMP_DIR/package/$SKILL_NAME" "$skills_dir/$SKILL_NAME"
  chmod +x "$skills_dir/$SKILL_NAME/scripts/calculate_tide_route.py"
  printf '已安装到 %s\n' "$skills_dir/$SKILL_NAME"
done

printf '重新打开 Agent 会话后，可要求：使用 $%s，计算 2026-08-12、吃水18米的通航时间。\n' "$SKILL_NAME"
