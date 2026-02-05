# Compound Product - Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the config at `compound.config.json` in the project root
2. Read the PRD at `[outputDir]/prd.json` (from config)
3. Read the progress log at `[outputDir]/progress.txt` (check Codebase Patterns section first)
4. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
5. Pick the **highest priority** task where `passes: false`
6. **Write tests first** (see Test-First Workflow below), then implement
7. Run quality checks from config `qualityChecks` array
8. Update CLAUDE.md files if you discover reusable patterns (see below)
9. If checks pass, commit ALL changes with message: `feat: [Task ID] - [Task Title]`
10. Update the PRD to set `passes: true` for the completed task
11. Append your progress to `[outputDir]/progress.txt`

## Test-First Workflow

For each task, follow this order:

1. **Identify testable logic** — pure functions, utilities, data transformations, validation logic, state derivations
2. **Write failing tests first** — create `*.test.ts` files next to the source file (e.g., `lib/supabase.test.ts` for `lib/supabase.ts`). Tests should assert the expected behavior from the acceptance criteria.
3. **Run tests to confirm they fail** — `npm run test` should show your new tests failing (red)
4. **Implement the code** — write the minimum code to make the tests pass
5. **Run tests again** — `npm run test` should now pass (green)

**What to test (test-first):**
- Pure functions (validation, formatting, translation lookups, role extraction)
- State logic (auth state derivation, error message mapping)
- Utility functions (helpers, transformers, parsers)

**What NOT to unit test (rely on browser tests instead):**
- React component rendering and DOM structure
- Supabase SDK calls (these are integration concerns — mock-heavy tests add cost without confidence)
- Routing and navigation behavior

When a task is purely UI wiring with no extractable logic, skip test-first and note this in the progress log.

## Progress Report Format

APPEND to progress.txt (never replace, always append):

```
## [Date/Time] - [Task ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the settings panel is in component X")
---
```

The learnings section is critical - it helps future iterations avoid repeating mistakes.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt:

```
## Codebase Patterns
- Example: Use `sql` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations  
- Example: Export types from actions.ts for UI components
```

Only add patterns that are **general and reusable**, not task-specific details.

## Update CLAUDE.md Files

Before committing, check if any edited files have learnings worth preserving in nearby CLAUDE.md files:

1. **Identify directories with edited files**
2. **Check for existing CLAUDE.md** in those directories or parent directories
3. **Add valuable learnings** - API patterns, gotchas, dependencies, testing approaches

**Examples of good CLAUDE.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"

**Do NOT add:**
- Task-specific implementation details
- Temporary debugging notes

## Quality Requirements

- ALL commits must pass your project's quality checks (from config)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Browser Testing (Required for Frontend Tasks)

For any task that changes UI, you MUST verify it works in the browser:

1. Use browser automation to navigate to the relevant page
2. Verify the UI changes work as expected
3. Take a screenshot if helpful

A frontend task is NOT complete until browser verification passes.

## Stop Condition

After completing a task, check if ALL tasks have `passes: true`.

If ALL tasks are complete and passing, reply with:

<promise>COMPLETE</promise>

If there are still tasks with `passes: false`, end your response normally (another iteration will pick up the next task).

## Important

- Work on ONE task per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
