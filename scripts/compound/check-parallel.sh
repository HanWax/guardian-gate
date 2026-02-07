#!/bin/bash
# Check which report items can be worked on in parallel
# Reads the report, claims file, and recent PRDs to determine status and dependencies
#
# Usage: ./scripts/compound/check-parallel.sh [report-path]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/compound.config.json"
CLAIMS_FILE="$PROJECT_ROOT/.compound-claims.json"

# Load config
REPORTS_DIR="./reports"
if [ -f "$CONFIG_FILE" ]; then
  REPORTS_DIR=$(jq -r '.reportsDir // "./reports"' "$CONFIG_FILE")
fi
REPORTS_DIR="$PROJECT_ROOT/$REPORTS_DIR"
TASKS_DIR="$PROJECT_ROOT/tasks"

# Determine report path
REPORT_PATH="${1:-}"
if [ -z "$REPORT_PATH" ]; then
  REPORT_PATH=$(ls -t "$REPORTS_DIR"/*.md 2>/dev/null | head -1)
fi

if [ -z "$REPORT_PATH" ] || [ ! -f "$REPORT_PATH" ]; then
  echo "Error: No report found. Usage: $0 [report-path]" >&2
  exit 1
fi

echo "Report: $(basename "$REPORT_PATH")"
echo "================================================"
echo ""

# Gather current claims
CLAIMS_INFO="None"
if [ -f "$CLAIMS_FILE" ]; then
  CLAIM_COUNT=$(jq '.claims | length' "$CLAIMS_FILE" 2>/dev/null || echo 0)
  if [ "$CLAIM_COUNT" -gt 0 ]; then
    CLAIMS_INFO=$(jq -r '.claims[] | "- \(.itemTitle) (PID \(.pid), branch: \(.branchName), heartbeat: \(.lastHeartbeat))"' "$CLAIMS_FILE")
  fi
fi

echo "Active Claims ($CLAIM_COUNT):"
echo "$CLAIMS_INFO"
echo ""

# Gather recent PRDs
RECENT_PRDS_INFO="None"
if [ -d "$TASKS_DIR" ]; then
  RECENT_PRDS=$(find "$TASKS_DIR" -name "prd-*.md" -mtime -7 2>/dev/null || true)
  if [ -n "$RECENT_PRDS" ]; then
    RECENT_PRDS_INFO=""
    for prd in $RECENT_PRDS; do
      TITLE=$(grep -m1 "^# " "$prd" 2>/dev/null | sed 's/^# //' || basename "$prd" .md)
      DATE=$(stat -f "%Sm" -t "%Y-%m-%d" "$prd" 2>/dev/null || stat -c "%y" "$prd" 2>/dev/null | cut -d' ' -f1)
      RECENT_PRDS_INFO="$RECENT_PRDS_INFO- $DATE: $TITLE
"
    done
  fi
fi

echo "Recently Completed (last 7 days):"
echo "$RECENT_PRDS_INFO"
echo ""

# Read report
REPORT_CONTENT=$(cat "$REPORT_PATH")

# Source environment variables if available
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.local"
  set +a
fi

# Detect provider (same logic as analyze-report.sh)
PROVIDER=""
if [ "$USE_CLAUDE_CODE" = "true" ] && command -v claude >/dev/null 2>&1; then
  PROVIDER="claude-code"
elif [ -n "$ANTHROPIC_API_KEY" ]; then
  PROVIDER="anthropic"
elif command -v claude >/dev/null 2>&1; then
  PROVIDER="claude-code"
fi

if [ -z "$PROVIDER" ]; then
  echo "No LLM provider available. Showing raw status only." >&2
  echo ""
  echo "To get AI-powered dependency analysis, set USE_CLAUDE_CODE=true or ANTHROPIC_API_KEY."
  exit 0
fi

PROMPT="Analyze this report and output a concise status table for each actionable item.

REPORT:
$REPORT_CONTENT

CURRENTLY CLAIMED (IN PROGRESS):
$CLAIMS_INFO

RECENTLY COMPLETED (last 7 days):
$RECENT_PRDS_INFO

For each item in the report, output a line in this format:
  STATUS | ITEM TITLE | CAN START NOW? | DEPENDS ON

Where STATUS is one of: COMPLETE, IN PROGRESS, NOT STARTED, BLOCKED
And CAN START NOW is Yes or No
And DEPENDS ON lists any items that must finish first (or 'none')

After the table, list which items can be safely worked on in parallel right now (items with no dependencies on each other that are NOT STARTED and not blocked).

Keep the output compact and terminal-friendly."

if [ "$PROVIDER" = "claude-code" ]; then
  echo "$PROMPT" | claude --print --dangerously-skip-permissions 2>/dev/null
elif [ "$PROVIDER" = "anthropic" ]; then
  PROMPT_ESCAPED=$(echo "$PROMPT" | jq -Rs .)
  RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
    -H "Content-Type: application/json" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -d "{
      \"model\": \"claude-3-5-haiku-20241022\",
      \"max_tokens\": 2048,
      \"messages\": [{\"role\": \"user\", \"content\": $PROMPT_ESCAPED}]
    }")
  echo "$RESPONSE" | jq -r '.content[0].text // empty'
fi
