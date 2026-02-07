#!/bin/bash
# Clean up stale claims from .compound-claims.json
# Removes claims where the PID is dead, worktree is missing, or heartbeat is stale
#
# Usage: ./scripts/compound/cleanup-claims.sh [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLAIMS_FILE="$PROJECT_ROOT/.compound-claims.json"
LOCK_FILE="$PROJECT_ROOT/.compound-lock"
DRY_RUN=false
STALE_MINUTES=10

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --stale-minutes)
      STALE_MINUTES="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

if [ ! -f "$CLAIMS_FILE" ]; then
  log "No claims file found at $CLAIMS_FILE. Nothing to clean."
  exit 0
fi

# Acquire lock
acquire_lock() {
  local attempts=0
  local max_attempts=15
  while [ $attempts -lt $max_attempts ]; do
    if /usr/bin/shlock -f "$LOCK_FILE" -p $$; then
      return 0
    fi
    attempts=$((attempts + 1))
    log "Lock held by another process, retrying ($attempts/$max_attempts)..."
    sleep 1
  done
  echo "Error: Could not acquire lock after $max_attempts attempts" >&2
  exit 1
}

release_lock() {
  rm -f "$LOCK_FILE"
}

acquire_lock
trap release_lock EXIT

CLAIM_COUNT=$(jq '.claims | length' "$CLAIMS_FILE")
log "Found $CLAIM_COUNT claim(s) in $CLAIMS_FILE"

if [ "$CLAIM_COUNT" -eq 0 ]; then
  log "No claims to clean."
  exit 0
fi

STALE_TITLES=()
NOW_EPOCH=$(date +%s)
STALE_THRESHOLD=$((STALE_MINUTES * 60))

# Check each claim
for i in $(seq 0 $((CLAIM_COUNT - 1))); do
  TITLE=$(jq -r ".claims[$i].itemTitle" "$CLAIMS_FILE")
  PID=$(jq -r ".claims[$i].pid" "$CLAIMS_FILE")
  WORKTREE=$(jq -r ".claims[$i].worktreePath" "$CLAIMS_FILE")
  HEARTBEAT=$(jq -r ".claims[$i].lastHeartbeat" "$CLAIMS_FILE")

  REASONS=()

  # Check if PID is alive
  if ! kill -0 "$PID" 2>/dev/null; then
    REASONS+=("PID $PID is dead")
  fi

  # Check if worktree exists
  if [ -n "$WORKTREE" ] && [ "$WORKTREE" != "null" ] && [ ! -d "$WORKTREE" ]; then
    REASONS+=("worktree missing: $WORKTREE")
  fi

  # Check heartbeat staleness
  if [ -n "$HEARTBEAT" ] && [ "$HEARTBEAT" != "null" ]; then
    # Convert ISO timestamp to epoch (macOS date)
    HB_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$HEARTBEAT" +%s 2>/dev/null || echo 0)
    if [ "$HB_EPOCH" -gt 0 ]; then
      AGE=$((NOW_EPOCH - HB_EPOCH))
      if [ "$AGE" -gt "$STALE_THRESHOLD" ]; then
        REASONS+=("heartbeat stale (${AGE}s old, threshold: ${STALE_THRESHOLD}s)")
      fi
    fi
  fi

  if [ ${#REASONS[@]} -gt 0 ]; then
    REASON_STR=$(IFS=', '; echo "${REASONS[*]}")
    if [ "$DRY_RUN" = true ]; then
      log "WOULD REMOVE: '$TITLE' — $REASON_STR"
    else
      log "REMOVING: '$TITLE' — $REASON_STR"
    fi
    STALE_TITLES+=("$TITLE")
  else
    log "OK: '$TITLE' (PID $PID alive, heartbeat fresh)"
  fi
done

if [ ${#STALE_TITLES[@]} -eq 0 ]; then
  log "All claims are healthy. Nothing to clean."
  exit 0
fi

if [ "$DRY_RUN" = true ]; then
  log "DRY RUN — would remove ${#STALE_TITLES[@]} claim(s). Run without --dry-run to clean up."
  exit 0
fi

# Remove stale claims
for title in "${STALE_TITLES[@]}"; do
  UPDATED=$(jq --arg title "$title" \
    '.claims = [.claims[] | select(.itemTitle != $title)]' \
    "$CLAIMS_FILE")
  echo "$UPDATED" > "$CLAIMS_FILE"
done

log "Removed ${#STALE_TITLES[@]} stale claim(s)."

# Check for orphaned worktrees
log "Checking for orphaned worktrees..."
WORKTREES_DIR="$PROJECT_ROOT/.worktrees"
if [ -d "$WORKTREES_DIR" ]; then
  for wt_dir in "$WORKTREES_DIR"/*/; do
    [ -d "$wt_dir" ] || continue
    wt_name=$(basename "$wt_dir")

    # Check if any claim references this worktree
    CLAIMED=$(jq -r --arg path "$wt_dir" '.claims[] | select(.worktreePath == $path) | .itemTitle' "$CLAIMS_FILE" 2>/dev/null || true)
    if [ -z "$CLAIMED" ]; then
      log "Removing orphaned worktree: $wt_dir"
      cd "$PROJECT_ROOT"
      git worktree remove "$wt_dir" --force 2>/dev/null || rm -rf "$wt_dir"
    fi
  done
fi

REMAINING=$(jq '.claims | length' "$CLAIMS_FILE")
log "Done. $REMAINING claim(s) remaining."
