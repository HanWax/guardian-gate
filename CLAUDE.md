# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GuardianGate (codenamed RoleCall) is a child safety check-in system for Israeli nurseries. The UI is entirely in Hebrew with RTL layout. Three user roles exist: **admin** (cross-nursery), **manager** (single nursery), **teacher** (single nursery, read-mostly).

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build (vite build + tsc --noEmit)
npm run typecheck    # TypeScript type checking only
npm run lint         # ESLint (flat config, ESLint 9)
npm run test         # Vitest (--passWithNoTests flag required)
npm run gen:types    # Regenerate Supabase DB types → src/lib/database.types.ts
npm run db:reset     # Reset local Supabase database
```

Quality checks that must all pass: `npm run lint && npm run test && npm run typecheck`

## Architecture

### Stack
TanStack Start + React 19 + Vite 7 + Tailwind CSS v4 + Supabase (Auth + Postgres) + React Query + Zod validation.

### Routing & Auth
- **File-based routing** via TanStack Router. Route files live in `src/routes/`. Adding/removing routes requires the dev server running to regenerate `src/routeTree.gen.ts`.
- **Route protection** uses `beforeLoad` with `requireAuth()` or `requireRole()` from `src/lib/auth-guard.ts`. Do not use middleware files.
- **Client-side auth state** flows through `AuthProvider` in `src/lib/auth-context.tsx`, mounted in `__root.tsx`. Access via `useAuth()` hook.
- Role is extracted from Supabase `user_metadata` by `extractRole()` in `src/lib/roles.ts`. Defaults to `'teacher'` for unknown/missing roles.

### Data Layer (3-tier pattern)
Each entity (children, parents, teachers) follows this structure:
1. **Schema** (`src/lib/schemas/*.ts`) — Zod schemas for create/update validation
2. **Server functions** (`src/lib/server/*.ts`) — TanStack `createServerFn` handlers that use a Supabase service-role client. Auth is verified via access token passed from the client.
3. **Query hooks** (`src/lib/queries/*.ts`) — React Query hooks wrapping server functions. Each module exports a `*Keys` factory for cache key consistency and `useCreate*`/`useUpdate*`/`useDelete*` mutations that invalidate queries on success.

`src/lib/queries/utils.ts` provides `getAccessToken()` to extract the session token before calling server functions.

### Client vs Server Supabase Clients
- **Client** (`src/lib/supabase.ts`): Uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` via `import.meta.env`
- **Server** (`src/lib/server/auth.ts`): Uses `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` via `process.env`. Created per-request via `createServiceClient()`.

### Database Schema
Supabase migrations in `supabase/migrations/`. Core tables: `nurseries` → `children`, `parents`, `children_parents` (junction), `managers`, `teachers`. Staff tables link to `auth.users` via `user_id`. RLS policies in migration `_000005`.

### RTL / Hebrew
- HTML root is `<html dir="rtl" lang="he">` (set in `__root.tsx`)
- Use CSS logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `text-start`) instead of directional (`pl-*`, `pr-*`, `ml-*`, `mr-*`, `text-left`)
- All user-facing strings are in Hebrew. Error messages use Hebrew translations (see `getHebrewErrorMessage()` in `src/lib/supabase.ts`)
- Hebrew quotes (`"`) in JSX need `{"..."}` wrapping to avoid `react/no-unescaped-entities`

### Path Aliases
`~/*` maps to `./src/*` (configured in both `tsconfig.json` and vite via `vite-tsconfig-paths`).

## Testing
- Vitest with jsdom, setup in `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest`)
- Test config is in `vite.config.ts` under the `test` key; `nitro` is externalized to avoid CJS warnings
- Unit tests exist for pure functions: `roles.test.ts`, `supabase.test.ts`, `validation.test.ts`, `children.test.ts`, `parents.test.ts`, `schemas/teacher.test.ts`

## React Code Standards

Follow the Vercel React Best Practices in `.agents/skills/vercel-react-best-practices/AGENTS.md`. Key priorities:
1. Eliminate async waterfalls — use `Promise.all()` for independent ops
2. Minimize bundle size — direct imports, no barrel files, dynamic imports for heavy components
3. Optimize re-renders — derive state during render, functional `setState`, `useRef` for transient values
4. Use ternary (not `&&`) for conditional rendering
