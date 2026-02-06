# PRD: Fix Navigation and Dashboard Stubs

## Introduction

Address two critical UX gaps: (1) The Teachers CRUD routes exist but are unreachable because the Navigation component lacks a /teachers link, and (2) all three dashboard landing pages (admin/manager/teacher) are empty stubs that provide no value after login. This PRD adds the missing nav link and populates dashboards with quick-access cards linking to entity management pages.

## Goals

- Make Teachers CRUD accessible via Navigation component
- Provide functional landing pages for all user roles
- Enable quick access to relevant entity management pages from dashboards
- Maintain Hebrew RTL consistency across all new UI elements

## Tasks

### T-001: Add /teachers link to Navigation component
**Description:** Update the Navigation component to include a link to /teachers, visible only to admin and manager roles.

**Acceptance Criteria:**
- [ ] Navigation component includes link to /teachers with Hebrew label {"מורות"}
- [ ] Link visible only when user role is 'admin' or 'manager' (not 'teacher')
- [ ] Link uses correct RTL-compatible Tailwind classes
- [ ] Quality checks pass (npm run lint && npm run test && npm run typecheck)
- [ ] Verify in browser: nav shows link for admin/manager, hidden for teacher

### T-002: Create DashboardCard component
**Description:** Build a reusable card component for dashboard quick-access links.

**Acceptance Criteria:**
- [ ] Create `src/components/DashboardCard.tsx` accepting title, description, href props
- [ ] Card uses Tailwind styling consistent with existing components
- [ ] Implements RTL-compatible spacing (ps-*, pe-*, ms-*, me-*)
- [ ] Links use TanStack Router's `<Link>` component
- [ ] Quality checks pass
- [ ] Component renders correctly in isolation

### T-003: Populate admin dashboard with quick-access cards
**Description:** Replace admin dashboard stub with cards linking to children, parents, teachers, and managers management pages.

**Acceptance Criteria:**
- [ ] Admin dashboard (`src/routes/admin/index.tsx`) renders 4 DashboardCard components
- [ ] Cards link to: /admin/children, /admin/parents, /admin/teachers, /admin/managers
- [ ] All titles and descriptions in Hebrew
- [ ] Cards arranged in responsive grid (2 columns on desktop, 1 on mobile)
- [ ] Quality checks pass
- [ ] Verify in browser: all cards visible and clickable, links navigate correctly

### T-004: Populate manager dashboard with quick-access cards
**Description:** Replace manager dashboard stub with cards linking to children, parents, and teachers management pages.

**Acceptance Criteria:**
- [ ] Manager dashboard (`src/routes/manager/index.tsx`) renders 3 DashboardCard components
- [ ] Cards link to: /manager/children, /manager/parents, /manager/teachers
- [ ] All titles and descriptions in Hebrew
- [ ] Cards arranged in responsive grid (2 columns on desktop, 1 on mobile)
- [ ] Quality checks pass
- [ ] Verify in browser: all cards visible and clickable, links navigate correctly

### T-005: Populate teacher dashboard with relevant content
**Description:** Replace teacher dashboard stub with content appropriate for read-mostly teacher role.

**Acceptance Criteria:**
- [ ] Teacher dashboard (`src/routes/teacher/index.tsx`) shows welcome message and quick links
- [ ] Links to: /teacher/children, /teacher/parents (view-only pages)
- [ ] All text in Hebrew with RTL-compatible styling
- [ ] Quality checks pass
- [ ] Verify in browser: content renders correctly, links navigate to view pages

## Functional Requirements

- FR-1: Navigation component must include a /teachers link visible to admin and manager roles
- FR-2: Admin dashboard must display 4 quick-access cards linking to children, parents, teachers, and managers management pages
- FR-3: Manager dashboard must display 3 quick-access cards linking to children, parents, and teachers management pages
- FR-4: Teacher dashboard must display relevant information and links appropriate for read-mostly access
- FR-5: All new UI text must be in Hebrew with proper RTL layout using CSS logical properties (ps-*, pe-*, ms-*, me-*)
- FR-6: All dashboard cards must use TanStack Router's Link component for navigation
- FR-7: Dashboard card layouts must be responsive (2-column on desktop, 1-column on mobile)

## Non-Goals (Out of Scope)

- NO entity count display (can be added as future enhancement)
- NO data fetching or API calls (dashboards are pure navigation UI)
- NO new database migrations or schema changes
- NO changes to existing CRUD routes or auth logic
- NO real-time updates or polling
- NO analytics or usage tracking
- NO role-based content customization beyond link visibility

## Technical Considerations

- **Existing patterns:** Follow TanStack Router patterns already in use for /children, /parents, /managers routes
- **Role detection:** Use `useAuth()` hook from `src/lib/auth-context.tsx` to check user role
- **RTL constraints:** Use only CSS logical properties (ps-*, pe-*, ms-*, me-*, text-start) — never directional (pl-*, pr-*, ml-*, mr-*, text-left)
- **Hebrew strings:** Wrap Hebrew quotes in JSX with `{" "}` to avoid `react/no-unescaped-entities` lint error
- **Testing:** Unit tests not required for pure UI components (browser verification sufficient), but must pass existing quality checks

## Success Metrics

- Teachers CRUD is reachable via navigation without manual URL entry
- All three dashboards provide immediate value with clear next actions
- Zero quality check failures (lint, test, typecheck all pass)
- Visual verification confirms proper Hebrew RTL rendering on all dashboards

## Open Questions

None — scope is fully defined and constraints are clear.
