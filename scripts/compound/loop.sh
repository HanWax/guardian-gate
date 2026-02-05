#!/bin/bash
# Compound Product - Execution Loop
# Runs AI agent repeatedly until all tasks in prd.json are complete.
#
# Usage: ./loop.sh [--tool amp|claude] [--resume] [max_iterations]
# See also: ./resume.sh for resuming a failed/interrupted run

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/compound.config.json"

# Load config
if [ -f "$CONFIG_FILE" ]; then
  TOOL=$(jq -r '.tool // "amp"' "$CONFIG_FILE")
  OUTPUT_DIR=$(jq -r '.outputDir // "./scripts/compound"' "$CONFIG_FILE")
  MAX_ITERATIONS=$(jq -r '.maxIterations // 10' "$CONFIG_FILE")
  MODEL=$(jq -r '.models.execute // "sonnet"' "$CONFIG_FILE")
else
  TOOL="amp"
  OUTPUT_DIR="./scripts/compound"
  MAX_ITERATIONS=10
  MODEL="sonnet"
fi

# Parse arguments (can override config)
RESUME=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --resume)
      RESUME=true
      shift
      ;;
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --model=*)
      MODEL="${1#*=}"
      shift
      ;;
    *)
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool
if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

# Resolve paths
OUTPUT_DIR="$PROJECT_ROOT/$OUTPUT_DIR"
PRD_FILE="$OUTPUT_DIR/prd.json"
PROGRESS_FILE="$OUTPUT_DIR/progress.txt"
STATE_FILE="$OUTPUT_DIR/loop-state.json"

# Note: Archiving is handled by auto-compound.sh before prd.json is overwritten
# This prevents archiving the wrong content when switching between features

# Handle resume
START_FROM=1
if [ "$RESUME" = true ]; then
  if [ -f "$STATE_FILE" ]; then
    START_FROM=$(jq -r '.nextIteration' "$STATE_FILE")
    TOOL=$(jq -r '.tool' "$STATE_FILE")
    MODEL=$(jq -r '.model' "$STATE_FILE")
    MAX_ITERATIONS=$(jq -r '.maxIterations' "$STATE_FILE")
    echo "Resuming from iteration $START_FROM (tool: $TOOL, model: $MODEL, max: $MAX_ITERATIONS)"
  else
    echo "No state file found at $STATE_FILE. Nothing to resume — starting fresh."
  fi
fi

# Initialize progress file
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Compound Product Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Compound Product Loop - Tool: $TOOL - Model: $MODEL - Iterations: $START_FROM to $MAX_ITERATIONS"

cd "$PROJECT_ROOT"

for i in $(seq $START_FROM $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Run the selected tool with the prompt
  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all --model "$MODEL" 2>&1 | tee /dev/stderr) || true
  else
    OUTPUT=$(claude --dangerously-skip-permissions --model "$MODEL" --print < "$SCRIPT_DIR/CLAUDE.md" 2>&1 | tee /dev/stderr) || true
  fi
  
  # Save state after each iteration so resume can pick up from the next one
  jq -n \
    --argjson next "$((i + 1))" \
    --arg tool "$TOOL" \
    --arg model "$MODEL" \
    --argjson max "$MAX_ITERATIONS" \
    --arg ts "$(date -Iseconds)" \
    '{nextIteration: $next, tool: $tool, model: $model, maxIterations: $max, lastCompleted: ($next - 1), savedAt: $ts}' \
    > "$STATE_FILE"

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "✅ Compound Product completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    rm -f "$STATE_FILE"
    exit 0
  fi

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
