# PRD: Basic Layout and Role-Based Routing

## Introduction

Build the core Hebrew RTL layout shell with navigation and implement role-based routing for admin, manager, and teacher users. This feature provides the foundational UI structure needed for all subsequent Phase 2 work (login page, CRUD screens, dashboards). It leverages existing auth infrastructure (`AuthContext`, `requireAuth()`, `extractRole()`) without requiring any database changes.

## Goals

- Provide a consistent Hebrew RTL layout shell for the entire application
- Enable role-based routing that directs users to appropriate dashboards after login
- Create navigation that conditionally displays links based on user role
- Establish reusable layout patterns for future UI development
- Unblock Phase 2 UI work by providing the structural foundation

## Tasks

### T-001: Create Layout Component with RTL Navigation
**Description:** Build a reusable layout component with sidebar/header navigation that supports Hebrew RTL text flow. The layout should include a navigation area and content area.

**Acceptance Criteria:**
- [ ] Create `src/components/Layout.tsx` with sidebar navigation
- [ ] Navigation renders on the right side (RTL-appropriate)
- [ ] Hebrew text in navigation flows right-to-left correctly
- [ ] Layout includes header and main content area
- [ ] Component accepts `children` prop for route content
- [ ] Quality checks pass (lint, typecheck)
- [ ] Verify in browser: layout renders with RTL flow

### T-002: Create Navigation Component with Role-Based Links
**Description:** Build a navigation component that reads the user's role from `AuthContext` and conditionally renders navigation links based on role permissions.

**Acceptance Criteria:**
- [ ] Create `src/components/Navigation.tsx` component
- [ ] Component uses `useAuth()` hook to get current user role
- [ ] Uses `extractRole()` from `lib/roles.ts` to parse role
- [ ] Renders navigation links conditionally based on role:
  - Admin: sees links to /admin, /manager, /teacher
  - Manager: sees links to /manager, /teacher
  - Teacher: sees link to /teacher only
- [ ] Links use Hebrew labels (e.g., "ניהול מורים", "לוח בקרה")
- [ ] Quality checks pass (lint, typecheck)
- [ ] Verify in browser: links render based on mocked role

### T-003: Create Role-Specific Dashboard Route Stubs
**Description:** Create three protected route files for admin, manager, and teacher dashboards with placeholder content. Each route should use `beforeLoad` with `requireAuth()` for protection.

**Acceptance Criteria:**
- [ ] Create `src/routes/admin.tsx` with admin dashboard placeholder
- [ ] Create `src/routes/manager.tsx` with manager dashboard placeholder
- [ ] Create `src/routes/teacher.tsx` with teacher dashboard placeholder
- [ ] Each route uses `beforeLoad` with `requireAuth()` from `lib/auth-guard.ts`
- [ ] Each dashboard renders role-appropriate Hebrew placeholder text
- [ ] Each dashboard wraps content in Layout component
- [ ] Dev server generates `routeTree.gen.ts` successfully
- [ ] Quality checks pass (lint, typecheck)
- [ ] Verify in browser: all three routes render correctly

### T-004: Add Role-Based Redirect Logic
**Description:** Implement logic to redirect users to their appropriate dashboard after login based on their role.

**Acceptance Criteria:**
- [ ] Create `src/lib/role-redirect.ts` helper function
- [ ] Function takes user role and returns appropriate path:
  - Admin → /admin
  - Manager → /manager
  - Teacher → /teacher
- [ ] Add unit test for role redirect logic in `src/lib/role-redirect.test.ts`
- [ ] Update index route to use redirect logic (or document pattern for future login page)
- [ ] Quality checks pass (lint, typecheck, test)
- [ ] Verify in browser: navigation to root redirects correctly (or shows expected behavior)

### T-005: Integration Testing and RTL Validation
**Description:** Perform end-to-end validation of the layout and routing system to ensure all pieces work together correctly with Hebrew RTL support.

**Acceptance Criteria:**
- [ ] Dev server runs without errors
- [ ] Navigate to /admin, /manager, /teacher routes successfully
- [ ] Navigation links appear/disappear correctly based on role context
- [ ] All Hebrew text flows right-to-left
- [ ] Layout sidebar appears on right side (RTL-appropriate)
- [ ] No console errors in browser
- [ ] Quality checks pass (lint, typecheck, test)
- [ ] Verify in browser: complete flow works end-to-end

## Functional Requirements

- FR-1: The system must provide a Layout component that supports Hebrew RTL text flow with sidebar navigation on the right side
- FR-2: Navigation links must render conditionally based on the logged-in user's role extracted from AuthContext
- FR-3: Admin users must see navigation links to /admin, /manager, and /teacher routes
- FR-4: Manager users must see navigation links to /manager and /teacher routes only
- FR-5: Teacher users must see navigation links to /teacher route only
- FR-6: The system must provide three protected routes: /admin, /manager, /teacher
- FR-7: Each protected route must use `beforeLoad` with `requireAuth()` for route protection
- FR-8: Each dashboard route must render role-appropriate placeholder content in Hebrew
- FR-9: The system must provide a role-based redirect helper that maps roles to appropriate dashboard paths
- FR-10: All layout and navigation elements must flow correctly in RTL direction

## Non-Goals (Out of Scope)

- **No actual dashboard functionality:** Dashboards will only display placeholder text, no data or interactions
- **No database migrations:** This feature uses only existing auth infrastructure
- **No authentication features:** Login/logout UI will be added in a separate task
- **No mobile responsiveness:** Desktop-first approach, mobile optimization comes later
- **No advanced styling:** Basic functional layout only, no design system implementation
- **No user profile features:** No user settings, profile editing, or preferences
- **No role management:** No UI for creating/editing roles, uses existing role data
- **No analytics or logging:** Basic functionality only

## Technical Considerations

### Existing Infrastructure
- Auth patterns already established: `AuthContext`, `requireAuth()`, `extractRole()`
- Hebrew RTL configured in `__root.tsx` with `dir="rtl" lang="he"`
- File-based routing auto-generates `routeTree.gen.ts` (dev server must be running)

### Component Patterns
- Use TanStack Router's `beforeLoad` for route protection
- Access auth context via `useAuth()` hook
- Follow existing Hebrew text patterns (wrap quotes in `{" "}` to avoid lint errors)

### Testing Strategy
- Unit tests for pure functions (role redirect logic)
- Browser verification for all UI tasks
- Quality checks must pass: lint, typecheck, test

### Dependencies
- No new dependencies required
- Uses existing stack: TanStack Start, React 19, Tailwind CSS v4

## Success Metrics

- All three role-specific dashboards are accessible and render correctly
- Navigation adapts correctly to different user roles
- Hebrew RTL layout flows naturally (text right-aligned, navigation on right)
- Zero console errors in browser during navigation
- All quality checks pass (lint, typecheck, test)
- Implementation completed within 2-4 hour window
- Foundation in place to begin Phase 2 UI work (login page, CRUD screens)

## Open Questions

- **Navigation styling:** Should we use Tailwind classes for basic styling or defer all styling? → Use basic Tailwind for functional layout
- **Role permission model:** Should we create a permissions helper or keep role checks inline? → Keep inline for now, extract if pattern repeats
- **Default route behavior:** What should unauthenticated users see at root `/`? → Defer to future login page task, show basic "Not authenticated" message for now
- **Mobile navigation:** Collapse sidebar on mobile or keep visible? → Out of scope, desktop-first approach

---

**Estimated Effort:** 2-4 hours
**Priority:** High (blocks Phase 2 UI work)
**Dependencies:** None (uses existing auth infrastructure)
**Risks:** Low (no database changes, uses proven patterns)
