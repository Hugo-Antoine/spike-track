#!/bin/bash
# Post-edit hook: auto-format JS/TS files with Prettier
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]] && exit 0

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.json|*.mdx)
    npx prettier --write "$FILE_PATH" 2>/dev/null
    ;;
esac
exit 0
