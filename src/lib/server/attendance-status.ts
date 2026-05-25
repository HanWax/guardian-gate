/**
 * Single source of truth for interpreting a parent's morning check-in response.
 *
 * `parent_response` is a free-form string column with three meaningful values:
 *   - 'dropping_off'       → child is coming, on time
 *   - 'dropping_off_late'  → child is coming, but late
 *   - 'not_today'          → child is not coming
 *   - null                 → parent has not responded yet
 *
 * 'dropping_off_late' was added after several read sites had already hard-coded
 * only 'dropping_off', which silently dropped late children from the teacher poll
 * and follow-ups. Route every "is this child expected to arrive?" check through
 * here so the two values can never drift apart again.
 */
export function isExpectedToArrive(parentResponse: string | null | undefined): boolean {
  return parentResponse === 'dropping_off' || parentResponse === 'dropping_off_late'
}
