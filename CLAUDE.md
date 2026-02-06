# RoleCall - Agent Knowledge Base

This file contains compounded learnings from development sessions. It is automatically updated by the compound engineering workflow.

## Project Overview

RoleCall is a project for managing roles and communications.

## React Code Standards

**When writing, reviewing, or refactoring any React component or TypeScript code in this project, you MUST follow the Vercel React Best Practices defined in `.agents/skills/vercel-react-best-practices/AGENTS.md`.** Read that file before writing React code.

Key rules to always apply (by priority):

1. **CRITICAL — Eliminate waterfalls**: Use `Promise.all()` for independent async ops, defer `await` to where results are needed, use Suspense boundaries for streaming
2. **CRITICAL — Bundle size**: Import directly from modules (no barrel files), use dynamic imports for heavy components, defer non-critical third-party scripts
3. **HIGH — Re-render optimization**: Derive state during render (not in effects), use functional `setState`, hoist default non-primitive props, use `useRef` for transient values
4. **MEDIUM — Rendering**: Use ternary (not `&&`) for conditional rendering, hoist static JSX outside components, use `content-visibility` for long lists
5. **MEDIUM — JS performance**: Use `Set`/`Map` for O(1) lookups, combine filter/map into single loops, return early from functions

For the full 57-rule reference with code examples, consult `.agents/skills/vercel-react-best-practices/AGENTS.md`.

## Codebase Patterns

<!-- Patterns discovered during development will be added here -->

## Gotchas & Pitfalls

<!-- Common mistakes and how to avoid them will be added here -->

## Architecture Notes

<!-- Key architectural decisions and context will be added here -->

## Testing Guidelines

<!-- Testing patterns and requirements will be added here -->
