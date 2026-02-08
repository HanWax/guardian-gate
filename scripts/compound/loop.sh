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
  ITERATION_TIMEOUT=$(jq -r '.iteration.timeout // 600' "$CONFIG_FILE")
  MAX_RETRIES=$(jq -r '.iteration.maxRetries // 2' "$CONFIG_FILE")
  MAX_CONSECUTIVE_FAILURES=$(jq -r '.iteration.maxConsecutiveFailures // 3' "$CONFIG_FILE")
else
  TOOL="amp"
  OUTPUT_DIR="./scripts/compound"
  MAX_ITERATIONS=10
  MODEL="sonnet"
  ITERATION_TIMEOUT=600
  MAX_RETRIES=2
  MAX_CONSECUTIVE_FAILURES=3
fi

# Parse arguments (can override config)
RESUME=false
CUSTOM_OUTPUT_DIR=""
CUSTOM_PROJECT_ROOT=""
CLAIMS_FILE=""
CLAIM_TITLE=""
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
    --output-dir)
      CUSTOM_OUTPUT_DIR="$2"
      shift 2
      ;;
    --output-dir=*)
      CUSTOM_OUTPUT_DIR="${1#*=}"
      shift
      ;;
    --project-root)
      CUSTOM_PROJECT_ROOT="$2"
      shift 2
      ;;
    --project-root=*)
      CUSTOM_PROJECT_ROOT="${1#*=}"
      shift
      ;;
    --claims-file)
      CLAIMS_FILE="$2"
      shift 2
      ;;
    --claims-file=*)
      CLAIMS_FILE="${1#*=}"
      shift
      ;;
    --claim-title)
      CLAIM_TITLE="$2"
      shift 2
      ;;
    --claim-title=*)
      CLAIM_TITLE="${1#*=}"
      shift
      ;;
    --iteration-timeout)
      ITERATION_TIMEOUT="$2"
      shift 2
      ;;
    --iteration-timeout=*)
      ITERATION_TIMEOUT="${1#*=}"
      shift
      ;;
    --max-retries)
      MAX_RETRIES="$2"
      shift 2
      ;;
    --max-retries=*)
      MAX_RETRIES="${1#*=}"
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

# Override project root if specified (for worktree mode)
if [ -n "$CUSTOM_PROJECT_ROOT" ]; then
  PROJECT_ROOT="$CUSTOM_PROJECT_ROOT"
fi

# Resolve paths
OUTPUT_DIR="$PROJECT_ROOT/$OUTPUT_DIR"

# Override output dir if specified (for worktree mode)
if [ -n "$CUSTOM_OUTPUT_DIR" ]; then
  OUTPUT_DIR="$CUSTOM_OUTPUT_DIR"
fi

PRD_FILE="$OUTPUT_DIR/prd.json"
PROGRESS_FILE="$OUTPUT_DIR/progress.txt"
STATE_FILE="$OUTPUT_DIR/loop-state.json"

# Heartbeat function for parallel mode
update_heartbeat() {
  if [ -n "$CLAIMS_FILE" ] && [ -f "$CLAIMS_FILE" ] && [ -n "$CLAIM_TITLE" ]; then
    local LOCK_FILE="${CLAIMS_FILE%.json}.lock"
    if /usr/bin/shlock -f "$LOCK_FILE" -p $$; then
      local NOW
      NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      local UPDATED
      UPDATED=$(jq --arg title "$CLAIM_TITLE" --arg ts "$NOW" \
        '.claims = [.claims[] | if .itemTitle == $title then .lastHeartbeat = $ts else . end]' \
        "$CLAIMS_FILE")
      echo "$UPDATED" > "$CLAIMS_FILE"
      rm -f "$LOCK_FILE"
    fi
  fi
}

# Note: Archiving is handled by auto-compound.sh before prd.json is overwritten
# This prevents archiving the wrong content when switching between features

# ── Iteration runner with timeout ──────────────────────────────────────

# Runs one iteration of the AI tool with a timeout.
# Sets ITERATION_OUTPUT on success.
# Returns 0 on success, 124 on timeout, 1 on empty output, or the tool's exit code.
ITERATION_OUTPUT=""
ITERATION_FAILURE_REASON=""

run_iteration() {
  local tmpfile
  tmpfile=$(mktemp)
  local timeout_marker="$tmpfile.timeout"
  local start_time exit_code duration output_len
  ITERATION_OUTPUT=""
  ITERATION_FAILURE_REASON=""

  > "$tmpfile"
  start_time=$(date +%s)

  # Live-stream output to stderr via tail -f
  tail -f "$tmpfile" >&2 2>/dev/null &
  local tail_pid=$!

  # Run the tool in background, output to temp file
  if [[ "$TOOL" == "amp" ]]; then
    cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all --model "$MODEL" > "$tmpfile" 2>&1 &
  else
    claude --dangerously-skip-permissions --model "$MODEL" --print < "$SCRIPT_DIR/CLAUDE.md" > "$tmpfile" 2>&1 &
  fi
  local cmd_pid=$!

  # Watchdog: kill command after timeout
  (
    sleep "$ITERATION_TIMEOUT"
    if kill -0 "$cmd_pid" 2>/dev/null; then
      touch "$timeout_marker"
      kill "$cmd_pid" 2>/dev/null
      sleep 3
      kill -9 "$cmd_pid" 2>/dev/null
    fi
  ) &
  local watchdog_pid=$!

  # Wait for command to finish (or be killed by watchdog)
  wait "$cmd_pid" 2>/dev/null || true
  exit_code=$?

  # Stop watchdog
  kill "$watchdog_pid" 2>/dev/null
  wait "$watchdog_pid" 2>/dev/null || true

  # Let tail catch up, then stop it
  sleep 0.5
  kill "$tail_pid" 2>/dev/null
  wait "$tail_pid" 2>/dev/null || true

  duration=$(( $(date +%s) - start_time ))

  # Read output
  ITERATION_OUTPUT=$(cat "$tmpfile")
  output_len=${#ITERATION_OUTPUT}

  # Determine failure reason
  if [ -f "$timeout_marker" ]; then
    ITERATION_FAILURE_REASON="timeout after ${ITERATION_TIMEOUT}s"
    rm -f "$timeout_marker"
    exit_code=124
  elif [ $exit_code -ne 0 ]; then
    ITERATION_FAILURE_REASON="exit code $exit_code"
  elif [ "$output_len" -lt 50 ]; then
    ITERATION_FAILURE_REASON="empty/minimal output (${output_len} chars)"
    exit_code=1
  fi

  # Log diagnostics
  echo ""
  echo "--- Iteration Diagnostics ---"
  echo "  Duration:  ${duration}s"
  echo "  Exit code: $exit_code"
  echo "  Output:    $output_len chars"
  if [ -n "$ITERATION_FAILURE_REASON" ]; then
    echo "  FAILURE:   $ITERATION_FAILURE_REASON"
  else
    echo "  Status:    OK"
  fi
  echo "-----------------------------"

  rm -f "$tmpfile"
  return $exit_code
}

# ── End iteration runner ───────────────────────────────────────────────

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
echo "  Timeout: ${ITERATION_TIMEOUT}s per iteration | Retries: $MAX_RETRIES | Max consecutive failures: $MAX_CONSECUTIVE_FAILURES"

# Create iteration log directory for post-mortem debugging
ITER_LOG_DIR="$OUTPUT_DIR/iteration-logs"
mkdir -p "$ITER_LOG_DIR"

cd "$PROJECT_ROOT"

consecutive_failures=0
total_failures=0

for i in $(seq $START_FROM $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Update heartbeat in parallel mode
  update_heartbeat

  # Run iteration with retry logic
  iteration_success=false
  for retry in $(seq 0 $MAX_RETRIES); do
    if [ "$retry" -gt 0 ]; then
      echo ""
      echo "  Retry $retry/$MAX_RETRIES for iteration $i..."
      sleep 5
    fi

    if run_iteration; then
      iteration_success=true
      break
    fi

    # Save failed attempt output for debugging
    if [ -n "$ITERATION_OUTPUT" ]; then
      echo "$ITERATION_OUTPUT" > "$ITER_LOG_DIR/iter-${i}-attempt-${retry}.log"
    fi
    echo "  [Failed attempt log saved to iteration-logs/iter-${i}-attempt-${retry}.log]"
  done

  if [ "$iteration_success" = false ]; then
    consecutive_failures=$((consecutive_failures + 1))
    total_failures=$((total_failures + 1))

    echo ""
    echo "  Iteration $i FAILED after $((MAX_RETRIES + 1)) attempt(s)"
    echo "  Last failure reason: $ITERATION_FAILURE_REASON"
    echo "  Consecutive failures: $consecutive_failures/$MAX_CONSECUTIVE_FAILURES"

    # Save state so --resume can pick up from this iteration (retry it)
    jq -n \
      --argjson next "$i" \
      --arg tool "$TOOL" \
      --arg model "$MODEL" \
      --argjson max "$MAX_ITERATIONS" \
      --arg ts "$(date -Iseconds)" \
      --arg reason "$ITERATION_FAILURE_REASON" \
      --argjson consec "$consecutive_failures" \
      '{nextIteration: $next, tool: $tool, model: $model, maxIterations: $max, lastFailed: $next, savedAt: $ts, lastFailureReason: $reason, consecutiveFailures: $consec}' \
      > "$STATE_FILE"

    if [ "$consecutive_failures" -ge "$MAX_CONSECUTIVE_FAILURES" ]; then
      echo ""
      echo "============================================================="
      echo "  ABORTING: $consecutive_failures consecutive failures"
      echo "============================================================="
      echo "  Threshold:       $MAX_CONSECUTIVE_FAILURES"
      echo "  Last failure:    $ITERATION_FAILURE_REASON"
      echo "  Failed at:       iteration $i of $MAX_ITERATIONS"
      echo "  Total failures:  $total_failures"
      echo ""
      echo "  Debug: check $ITER_LOG_DIR/ for per-attempt logs"
      echo "  Resume: ./loop.sh --resume"
      echo "============================================================="
      exit 1
    fi

    echo "  Skipping to next iteration..."
    continue
  fi

  # Success — reset consecutive failures
  consecutive_failures=0
  OUTPUT="$ITERATION_OUTPUT"

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
    echo "Compound Product completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS (total failures: $total_failures)"
    rm -f "$STATE_FILE"
    exit 0
  fi

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Total failures: $total_failures"
echo "Check $PROGRESS_FILE for status."
echo "Debug: check $ITER_LOG_DIR/ for per-attempt logs"
exit 1
