#!/bin/bash
# Compound Product - Full Pipeline
# Reads a report, picks #1 priority, creates PRD + tasks, runs loop, creates PR
#
# Usage: ./auto-compound.sh [--dry-run] [--resume] [--parallel]
#
# Requirements:
# - claude CLI installed and authenticated (uses your Pro subscription)
# - gh CLI installed and authenticated
# - jq installed
#
# LLM Provider (set in .env.local):
# - USE_CLAUDE_CODE=true (recommended - uses Pro subscription, no API credits)
# - Or ANTHROPIC_API_KEY for direct API (requires API credits)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/compound.config.json"
DRY_RUN=false
RESUME=false
PARALLEL_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --resume)
      RESUME=true
      shift
      ;;
    --parallel)
      PARALLEL_MODE=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
  exit 1
}

# ── Parallel mode functions ──────────────────────────────────────────

# Note: CLAIMS_FILE/LOCK_FILE use PROJECT_ROOT set at top of script
CLAIMS_FILE="${PROJECT_ROOT}/.compound-claims.json"
LOCK_FILE="${PROJECT_ROOT}/.compound-lock"
WORKTREE_DIR=""

init_claims_file() {
  if [ ! -f "$CLAIMS_FILE" ]; then
    echo '{"version":"1.0","claims":[]}' > "$CLAIMS_FILE"
    log "Initialized claims file: $CLAIMS_FILE"
  fi
}

acquire_lock() {
  local attempts=0
  local max_attempts=30
  while [ $attempts -lt $max_attempts ]; do
    if /usr/bin/shlock -f "$LOCK_FILE" -p $$; then
      return 0
    fi
    attempts=$((attempts + 1))
    log "Lock held by another process, retrying ($attempts/$max_attempts)..."
    sleep 1
  done
  error "Could not acquire lock after $max_attempts attempts"
}

release_lock() {
  rm -f "$LOCK_FILE"
}

get_claimed_titles() {
  if [ -f "$CLAIMS_FILE" ]; then
    jq -r '.claims[].itemTitle' "$CLAIMS_FILE" 2>/dev/null || true
  fi
}

add_claim() {
  local item_title="$1"
  local branch_name="$2"
  local worktree_path="$3"
  local NOW
  NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local UPDATED
  UPDATED=$(jq --arg title "$item_title" \
    --arg branch "$branch_name" \
    --argjson pid $$ \
    --arg wt "$worktree_path" \
    --arg ts "$NOW" \
    '.claims += [{"itemTitle":$title,"branchName":$branch,"pid":$pid,"worktreePath":$wt,"claimedAt":$ts,"lastHeartbeat":$ts}]' \
    "$CLAIMS_FILE")
  echo "$UPDATED" > "$CLAIMS_FILE"
  log "Claimed item: $item_title (PID $$)"
}

remove_claim() {
  local item_title="$1"
  if [ -f "$CLAIMS_FILE" ]; then
    local UPDATED
    UPDATED=$(jq --arg title "$item_title" \
      '.claims = [.claims[] | select(.itemTitle != $title)]' \
      "$CLAIMS_FILE")
    echo "$UPDATED" > "$CLAIMS_FILE"
    log "Released claim: $item_title"
  fi
}

update_heartbeat() {
  local item_title="$1"
  if [ -f "$CLAIMS_FILE" ]; then
    local NOW
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local UPDATED
    UPDATED=$(jq --arg title "$item_title" --arg ts "$NOW" \
      '.claims = [.claims[] | if .itemTitle == $title then .lastHeartbeat = $ts else . end]' \
      "$CLAIMS_FILE")
    echo "$UPDATED" > "$CLAIMS_FILE"
  fi
}

create_worktree() {
  local branch_name="$1"
  local slug
  slug=$(echo "$branch_name" | sed "s|^${BRANCH_PREFIX}||")
  WORKTREE_DIR="$PROJECT_ROOT/.worktrees/$slug"

  if [ -d "$WORKTREE_DIR" ]; then
    log "Worktree already exists at $WORKTREE_DIR, reusing..."
    return 0
  fi

  log "Creating worktree at $WORKTREE_DIR from main..."
  git worktree add "$WORKTREE_DIR" main
  cd "$WORKTREE_DIR"
  git checkout -b "$branch_name" || git checkout "$branch_name"
  cd "$PROJECT_ROOT"
  log "Worktree ready: $WORKTREE_DIR"
}

cleanup_worktree() {
  if [ -n "$WORKTREE_DIR" ] && [ -d "$WORKTREE_DIR" ]; then
    log "Cleaning up worktree: $WORKTREE_DIR"
    cd "$PROJECT_ROOT"
    git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
    WORKTREE_DIR=""
  fi
}

trap_cleanup() {
  local exit_code=$?
  log "Caught signal, cleaning up (exit code: $exit_code)..."
  release_lock
  if [ "$PARALLEL_MODE" = true ] && [ -n "${PRIORITY_ITEM:-}" ]; then
    remove_claim "$PRIORITY_ITEM" 2>/dev/null || true
  fi
  cleanup_worktree
  exit $exit_code
}

# ── End parallel mode functions ──────────────────────────────────────

# Load config
if [ ! -f "$CONFIG_FILE" ]; then
  error "Config file not found: $CONFIG_FILE. Run install.sh first or copy config.example.json"
fi

TOOL=$(jq -r '.tool // "amp"' "$CONFIG_FILE")
REPORTS_DIR=$(jq -r '.reportsDir // "./reports"' "$CONFIG_FILE")
OUTPUT_DIR=$(jq -r '.outputDir // "./scripts/compound"' "$CONFIG_FILE")
MAX_ITERATIONS=$(jq -r '.maxIterations // 25' "$CONFIG_FILE")
BRANCH_PREFIX=$(jq -r '.branchPrefix // "compound/"' "$CONFIG_FILE")
ANALYZE_COMMAND=$(jq -r '.analyzeCommand // ""' "$CONFIG_FILE")
QUALITY_CHECKS=$(jq -r '.qualityChecks // ["echo No quality checks configured"]' "$CONFIG_FILE")

# Model configuration for cost/speed optimization
MODEL_PRD=$(jq -r '.models.prd // "sonnet"' "$CONFIG_FILE")
MODEL_TASKS=$(jq -r '.models.tasks // "haiku"' "$CONFIG_FILE")
MODEL_EXECUTE=$(jq -r '.models.execute // "sonnet"' "$CONFIG_FILE")

# Resolve paths
REPORTS_DIR="$PROJECT_ROOT/$REPORTS_DIR"
OUTPUT_DIR="$PROJECT_ROOT/$OUTPUT_DIR"
TASKS_DIR="$PROJECT_ROOT/tasks"

# Check requirements
command -v "$TOOL" >/dev/null 2>&1 || error "$TOOL CLI not found"
command -v gh >/dev/null 2>&1 || error "gh CLI not found. Install with: brew install gh"
command -v jq >/dev/null 2>&1 || error "jq not found. Install with: brew install jq"
# LLM provider check is handled by analyze-report.sh with helpful setup guidance

cd "$PROJECT_ROOT"

# Set up cleanup trap for parallel mode
if [ "$PARALLEL_MODE" = true ]; then
  trap trap_cleanup INT TERM ERR
fi

# Source environment variables if available
if [ -f ".env.local" ]; then
  set -a
  source .env.local
  set +a
fi

# Check for --resume with existing prd.json
PRD_FILE="$OUTPUT_DIR/prd.json"
PROGRESS_FILE="$OUTPUT_DIR/progress.txt"

if [ "$RESUME" = true ]; then
  if [ ! -f "$PRD_FILE" ]; then
    error "Cannot resume: no prd.json found at $PRD_FILE"
  fi

  REMAINING=$(jq '[.tasks[] | select(.passes == false)] | length' "$PRD_FILE")
  TOTAL=$(jq '.tasks | length' "$PRD_FILE")
  BRANCH_NAME=$(jq -r '.branchName // empty' "$PRD_FILE")
  PRIORITY_ITEM=$(jq -r '.description // empty' "$PRD_FILE")
  RATIONALE="(resumed from existing prd.json)"
  REPORT_NAME="(resumed)"

  if [ "$REMAINING" -eq 0 ]; then
    log "All $TOTAL tasks already pass. Nothing to resume."
    exit 0
  fi

  [ -n "$BRANCH_NAME" ] || error "Cannot resume: prd.json has no branchName"

  log "Resuming existing run: $PRIORITY_ITEM"
  log "Branch: $BRANCH_NAME"
  log "Tasks remaining: $REMAINING of $TOTAL"

  if [ "$DRY_RUN" = true ]; then
    log "DRY RUN - Would resume with:"
    jq '{branch: .branchName, description: .description, remaining: [.tasks[] | select(.passes == false) | {id, title}]}' "$PRD_FILE"
    exit 0
  fi

  # Ensure we're on the correct branch
  CURRENT_BRANCH=$(git branch --show-current)
  if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    log "Switching to branch $BRANCH_NAME..."
    git checkout "$BRANCH_NAME" || error "Failed to checkout branch $BRANCH_NAME"
  fi

else
  # === Full pipeline: Steps 1-5 ===

  # Step 1: Find most recent report
  log "Step 1: Finding most recent report..."
  git pull origin main 2>/dev/null || true

  LATEST_REPORT=$(ls -t "$REPORTS_DIR"/*.md 2>/dev/null | head -1)
  [ -f "$LATEST_REPORT" ] || error "No reports found in $REPORTS_DIR"
  REPORT_NAME=$(basename "$LATEST_REPORT")
  log "Using report: $REPORT_NAME"

  # Step 2: Analyze report (with exclusions in parallel mode)
  log "Step 2: Analyzing report to pick #1 actionable priority..."

  EXCLUDE_ARGS=()
  if [ "$PARALLEL_MODE" = true ]; then
    init_claims_file
    acquire_lock

    # Read currently claimed titles
    CLAIMED_TITLES=()
    while IFS= read -r title; do
      [ -n "$title" ] && CLAIMED_TITLES+=("$title")
    done < <(get_claimed_titles)

    release_lock

    if [ ${#CLAIMED_TITLES[@]} -gt 0 ]; then
      EXCLUDE_ARGS+=(--exclude-titles)
      for title in "${CLAIMED_TITLES[@]}"; do
        EXCLUDE_ARGS+=("$title")
      done
      log "Excluding ${#CLAIMED_TITLES[@]} claimed item(s): ${CLAIMED_TITLES[*]}"
    fi
  fi

  if [ -n "$ANALYZE_COMMAND" ]; then
    # Use custom analyze command
    # Note: This executes the command from config - ensure your config is trusted
    ANALYSIS_JSON=$(bash -c "$ANALYZE_COMMAND \"$LATEST_REPORT\"" 2>/dev/null)
  else
    # Use default analyze script (pass exclusions for parallel mode)
    ANALYSIS_JSON=$("$SCRIPT_DIR/analyze-report.sh" "$LATEST_REPORT" "${EXCLUDE_ARGS[@]}" 2>/dev/null)
  fi

  [ -n "$ANALYSIS_JSON" ] || error "Failed to analyze report"

  # Parse the analysis
  PRIORITY_ITEM=$(echo "$ANALYSIS_JSON" | jq -r '.priority_item // empty')
  DESCRIPTION=$(echo "$ANALYSIS_JSON" | jq -r '.description // empty')
  RATIONALE=$(echo "$ANALYSIS_JSON" | jq -r '.rationale // empty')
  BRANCH_NAME=$(echo "$ANALYSIS_JSON" | jq -r '.branch_name // empty')

  [ -n "$PRIORITY_ITEM" ] || error "Failed to parse priority item from analysis"

  # Ensure branch has correct prefix
  if [[ "$BRANCH_NAME" != "$BRANCH_PREFIX"* ]]; then
    BRANCH_NAME="${BRANCH_PREFIX}$(echo "$BRANCH_NAME" | sed "s|^[^/]*/||")"
  fi

  log "Priority item: $PRIORITY_ITEM"
  log "Branch: $BRANCH_NAME"
  log "Rationale: $RATIONALE"

  # In parallel mode, claim the item before proceeding
  if [ "$PARALLEL_MODE" = true ]; then
    local_slug=$(echo "$BRANCH_NAME" | sed "s|^${BRANCH_PREFIX}||")
    local_worktree="$PROJECT_ROOT/.worktrees/$local_slug"

    acquire_lock
    add_claim "$PRIORITY_ITEM" "$BRANCH_NAME" "$local_worktree"
    release_lock
  fi

  if [ "$DRY_RUN" = true ]; then
    log "DRY RUN - Would proceed with:"
    echo "$ANALYSIS_JSON" | jq .
    if [ "$PARALLEL_MODE" = true ]; then
      log "DRY RUN - Claim registered in $CLAIMS_FILE (will be cleaned by cleanup-claims.sh)"
    fi
    exit 0
  fi

  # Step 3: Create feature branch (worktree in parallel mode)
  if [ "$PARALLEL_MODE" = true ]; then
    log "Step 3: Creating worktree and feature branch..."
    create_worktree "$BRANCH_NAME"
    WORK_DIR="$WORKTREE_DIR"
    WORK_OUTPUT_DIR="$WORKTREE_DIR/scripts/compound"
    WORK_TASKS_DIR="$WORKTREE_DIR/tasks"
    mkdir -p "$WORK_OUTPUT_DIR" "$WORK_TASKS_DIR"
  else
    log "Step 3: Creating feature branch..."
    git checkout main
    git checkout -b "$BRANCH_NAME" || git checkout "$BRANCH_NAME"
    WORK_DIR="$PROJECT_ROOT"
    WORK_OUTPUT_DIR="$OUTPUT_DIR"
    WORK_TASKS_DIR="$TASKS_DIR"
  fi

  # Step 4: Use agent to create PRD
  log "Step 4: Creating PRD with $TOOL..."

  PRD_FILENAME="prd-$(echo "$BRANCH_NAME" | sed "s|^${BRANCH_PREFIX}||").md"
  mkdir -p "$WORK_TASKS_DIR"

  PRD_SAVE_PATH="tasks/$PRD_FILENAME"

  PRD_PROMPT="Load the prd skill. Create a PRD for: $PRIORITY_ITEM

Description: $DESCRIPTION

Rationale from report analysis: $RATIONALE

Acceptance criteria from analysis:
$(echo "$ANALYSIS_JSON" | jq -r '.acceptance_criteria[]' | sed 's/^/- /')

IMPORTANT CONSTRAINTS:
- NO database migrations or schema changes
- Keep scope small - this should be completable in 2-4 hours
- Break into 3-5 small tasks maximum
- Each task must be verifiable with quality checks and/or browser testing
- DO NOT ask clarifying questions - you have enough context to proceed
- Generate the PRD immediately without waiting for user input

Save the PRD to: $PRD_SAVE_PATH"

  log "Using model '$MODEL_PRD' for PRD generation"
  if [ "$PARALLEL_MODE" = true ]; then
    cd "$WORK_DIR"
  fi
  if [[ "$TOOL" == "amp" ]]; then
    echo "$PRD_PROMPT" | amp --execute --dangerously-allow-all --model "$MODEL_PRD" 2>&1 | tee "$WORK_OUTPUT_DIR/auto-compound-prd.log"
  else
    echo "$PRD_PROMPT" | claude --dangerously-skip-permissions --model "$MODEL_PRD" 2>&1 | tee "$WORK_OUTPUT_DIR/auto-compound-prd.log"
  fi

  # Verify PRD was created
  PRD_PATH="$WORK_TASKS_DIR/$PRD_FILENAME"
  [ -f "$PRD_PATH" ] || error "PRD was not created at $PRD_PATH"
  log "PRD created: $PRD_PATH"

  # Archive previous run before overwriting prd.json (skip in parallel mode — each worktree is fresh)
  if [ "$PARALLEL_MODE" != true ]; then
    ARCHIVE_DIR="$OUTPUT_DIR/archive"

    if [ -f "$PRD_FILE" ]; then
      OLD_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")

      if [ -n "$OLD_BRANCH" ] && [ "$OLD_BRANCH" != "$BRANCH_NAME" ]; then
        DATE=$(date +%Y-%m-%d)
        FOLDER_NAME=$(echo "$OLD_BRANCH" | sed 's|^[^/]*/||')
        ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

        log "Archiving previous run: $OLD_BRANCH"
        mkdir -p "$ARCHIVE_FOLDER"
        cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
        [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
        log "Archived to: $ARCHIVE_FOLDER"
      fi
    fi
  fi

  # Step 5: Use agent to convert PRD to tasks
  log "Step 5: Converting PRD to prd.json with $TOOL..."

  TASKS_PROMPT="Load the tasks skill. Convert $PRD_PATH to $WORK_OUTPUT_DIR/prd.json

Use branch name: $BRANCH_NAME

Remember: Each task must be small enough to complete in one iteration."

  log "Using model '$MODEL_TASKS' for task conversion"
  if [[ "$TOOL" == "amp" ]]; then
    echo "$TASKS_PROMPT" | amp --execute --dangerously-allow-all --model "$MODEL_TASKS" 2>&1 | tee "$WORK_OUTPUT_DIR/auto-compound-tasks.log"
  else
    echo "$TASKS_PROMPT" | claude --dangerously-skip-permissions --model "$MODEL_TASKS" 2>&1 | tee "$WORK_OUTPUT_DIR/auto-compound-tasks.log"
  fi

  # Verify prd.json was created
  [ -f "$WORK_OUTPUT_DIR/prd.json" ] || error "prd.json was not created"
  log "Tasks created: $(jq '.tasks | length' "$WORK_OUTPUT_DIR/prd.json") tasks"

  # Commit the PRD and prd.json
  if [ "$PARALLEL_MODE" = true ]; then
    cd "$WORK_DIR"
    git add "tasks/$PRD_FILENAME" "scripts/compound/prd.json"
  else
    git add "$PRD_PATH" "$OUTPUT_DIR/prd.json"
  fi
  git commit -m "chore: add PRD and tasks for $PRIORITY_ITEM" || true

  if [ "$PARALLEL_MODE" = true ]; then
    cd "$PROJECT_ROOT"
  fi

fi

# Set WORK_* defaults for resume path (non-parallel always uses project root)
WORK_DIR="${WORK_DIR:-$PROJECT_ROOT}"
WORK_OUTPUT_DIR="${WORK_OUTPUT_DIR:-$OUTPUT_DIR}"
WORK_TASKS_DIR="${WORK_TASKS_DIR:-$TASKS_DIR}"

# Step 6: Run the loop
log "Step 6: Running execution loop (max $MAX_ITERATIONS iterations, model: $MODEL_EXECUTE)..."

LOOP_ARGS=(--model "$MODEL_EXECUTE" "$MAX_ITERATIONS")
if [ "$PARALLEL_MODE" = true ]; then
  LOOP_ARGS+=(--output-dir "$WORK_OUTPUT_DIR")
  LOOP_ARGS+=(--project-root "$WORK_DIR")
  LOOP_ARGS+=(--claims-file "$CLAIMS_FILE")
  LOOP_ARGS+=(--claim-title "$PRIORITY_ITEM")
fi

"$SCRIPT_DIR/loop.sh" "${LOOP_ARGS[@]}" 2>&1 | tee "$WORK_OUTPUT_DIR/auto-compound-execution.log"

# Determine the PRD file location for completion steps
WORK_PRD_FILE="$WORK_OUTPUT_DIR/prd.json"

# Step 7: Update report with completion status
log "Step 7: Updating report with task completion status..."

if [ "$PARALLEL_MODE" = true ]; then
  # In parallel mode: switch to main repo to update report
  cd "$PROJECT_ROOT"

  acquire_lock

  # Pull latest main to get any updates from other parallel workers
  git stash 2>/dev/null || true
  git checkout main 2>/dev/null || true
  git pull origin main 2>/dev/null || true
fi

# On resume, LATEST_REPORT may not be set — try to find it
if [ -z "${LATEST_REPORT:-}" ]; then
  LATEST_REPORT=$(ls -t "$REPORTS_DIR"/*.md 2>/dev/null | head -1)
fi

if [ -f "${LATEST_REPORT:-}" ]; then
  COMPLETED_COUNT=$(jq '[.tasks[] | select(.passes == true)] | length' "$WORK_PRD_FILE")
  TOTAL_COUNT=$(jq '.tasks | length' "$WORK_PRD_FILE")

  UPDATE_PROMPT="Update the report at $LATEST_REPORT to reflect that '$PRIORITY_ITEM' is now COMPLETE.

Specifically:
1. Change the status of the item from 'NOT STARTED' or 'IN PROGRESS' to 'COMPLETE'
2. Add a brief summary of what was implemented (2-3 bullet points based on the branch name and description)
3. Update the Progress Summary table counts (increment Complete, decrement Remaining for the relevant phase)
4. Remove the completed item from the 'Next Up' recommended order list and renumber remaining items
5. Update the 'Last updated' date at the bottom to today's date

Tasks completed: $COMPLETED_COUNT/$TOTAL_COUNT
Branch: $BRANCH_NAME

Do NOT change anything else in the report. Keep all other content exactly as-is."

  if [[ "$TOOL" == "amp" ]]; then
    echo "$UPDATE_PROMPT" | amp --execute --dangerously-allow-all --model "$MODEL_TASKS" 2>&1 | tee -a "$WORK_OUTPUT_DIR/auto-compound-execution.log"
  else
    echo "$UPDATE_PROMPT" | claude --dangerously-skip-permissions --model "$MODEL_TASKS" 2>&1 | tee -a "$WORK_OUTPUT_DIR/auto-compound-execution.log"
  fi

  # Commit the updated report
  git add "$LATEST_REPORT"
  git commit -m "docs: update report - $PRIORITY_ITEM complete" || true
  git push origin main 2>/dev/null || true
  log "Report updated"
else
  log "Skipping report update (no report file found or resumed run)"
fi

if [ "$PARALLEL_MODE" = true ]; then
  # Remove the claim now that report is updated
  remove_claim "$PRIORITY_ITEM"
  release_lock
fi

# Step 8: Create PR
log "Step 8: Creating Pull Request..."

if [ "$PARALLEL_MODE" = true ]; then
  # Push from worktree
  cd "$WORK_DIR"
fi

git push -u origin "$BRANCH_NAME"

PR_BODY="## Compound Product: $PRIORITY_ITEM

**Generated from report:** $REPORT_NAME

### Rationale
$RATIONALE

### What was done
\`\`\`
$(tail -50 "$WORK_OUTPUT_DIR/progress.txt")
\`\`\`

### Tasks completed
\`\`\`json
$(jq '.tasks[] | {id, title, passes}' "$WORK_PRD_FILE")
\`\`\`

---
*This PR was automatically generated by Compound Product from report analysis.*"

PR_URL=$(gh pr create \
  --title "Compound: $PRIORITY_ITEM" \
  --body "$PR_BODY" \
  --base main \
  --head "$BRANCH_NAME")

log "✅ Complete! PR created: $PR_URL"
log "Review the PR and merge if the changes look good."

# Step 9: Clean up worktree (parallel mode only)
if [ "$PARALLEL_MODE" = true ]; then
  cd "$PROJECT_ROOT"
  cleanup_worktree
  log "Worktree cleaned up. Done."
fi
