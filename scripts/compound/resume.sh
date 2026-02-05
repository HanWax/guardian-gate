#!/bin/bash
# Compound Product - Resume an interrupted loop
#
# Reads the saved state from loop-state.json and resumes the loop
# from the iteration after the last completed one.
#
# Usage: ./resume.sh
#
# This is equivalent to: ./loop.sh --resume
# Any extra arguments are passed through to loop.sh (e.g. --tool, --model).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/compound.config.json"

# Resolve output dir from config
if [ -f "$CONFIG_FILE" ]; then
  OUTPUT_DIR=$(jq -r '.outputDir // "./scripts/compound"' "$CONFIG_FILE")
else
  OUTPUT_DIR="./scripts/compound"
fi

STATE_FILE="$PROJECT_ROOT/$OUTPUT_DIR/loop-state.json"

if [ ! -f "$STATE_FILE" ]; then
  echo "No saved state found at $STATE_FILE"
  echo "There is nothing to resume. Run ./loop.sh to start a new run."
  exit 1
fi

echo "Found saved loop state:"
jq '.' "$STATE_FILE"
echo ""

exec "$SCRIPT_DIR/loop.sh" --resume "$@"
