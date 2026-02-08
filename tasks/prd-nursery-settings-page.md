# PRD: Nursery Settings Page

## Introduction

Build a settings page where admins and managers can configure nursery timing parameters (drop-off window, message timing) and timezone. This enables proper scheduling for Phase 3 WhatsApp integration. The page follows existing CRUD patterns and requires no database migrations since the nurseries table already contains these fields.

## Goals

- Provide a UI for admins/managers to view and edit nursery timing configuration
- Validate time inputs with Zod schemas and display Hebrew error messages
- Persist changes to the nurseries table via server functions
- Follow established patterns from children/parents/teachers CRUD pages
- Complete implementation in 2-4 hours with 3-5 small tasks

## Tasks

### T-001: Create nursery settings schema and server functions
**Description:** Define Zod validation schema for nursery settings (dropoff_start, dropoff_end, first_message_time, second_ping_time, timezone) and implement server function to update nursery settings using service-role client.

**Acceptance Criteria:**
- [ ] Create `src/lib/schemas/nursery.ts` with `updateNurserySettingsSchema` (Zod validation for time fields and timezone)
- [ ] Create `src/lib/server/nurseries.ts` with `updateNurserySettings` server function that accepts accessToken and validated data
- [ ] Server function verifies auth and updates nurseries table
- [ ] Quality checks pass (`npm run lint && npm run test && npm run typecheck`)

### T-002: Create React Query hooks for nursery settings
**Description:** Implement query and mutation hooks for fetching and updating nursery settings, following the pattern in `src/lib/queries/children.ts`.

**Acceptance Criteria:**
- [ ] Create `src/lib/queries/nurseries.ts` with `nurseriesKeys` factory
- [ ] Export `useNurserySettings(nurseryId)` query hook
- [ ] Export `useUpdateNurserySettings()` mutation hook that invalidates nursery query on success
- [ ] Hooks use `getAccessToken()` from `src/lib/queries/utils.ts`
- [ ] Quality checks pass

### T-003: Build nursery settings route and form component
**Description:** Create `/settings` route with form displaying and editing nursery timing fields. Use TanStack Form for validation and React Query mutation for persistence.

**Acceptance Criteria:**
- [ ] Create `src/routes/settings.tsx` with `beforeLoad: requireAuth()` protection
- [ ] Form displays current values for dropoff_start, dropoff_end, first_message_time, second_ping_time, timezone
- [ ] Time inputs use HTML time input type for proper validation
- [ ] Timezone uses select dropdown with common options (at minimum: Asia/Jerusalem, UTC)
- [ ] Form validates inputs with nursery schema and shows Hebrew error messages
- [ ] Successful save shows Hebrew success toast/message
- [ ] Form uses logical CSS properties (ps-*, pe-*, ms-*, me-*) for RTL
- [ ] Quality checks pass
- [ ] **Verify in browser:** Form loads, displays current values, validates inputs, saves successfully

### T-004: Add settings navigation link to sidebar
**Description:** Add "הגדרות משתלה" (Nursery Settings) link to the navigation sidebar, visible only to admin and manager roles.

**Acceptance Criteria:**
- [ ] Settings link added to sidebar navigation in appropriate component
- [ ] Link visible only to admin and manager roles (not teachers)
- [ ] Link navigates to `/settings` route
- [ ] Link uses Hebrew text "הגדרות משתלה"
- [ ] Quality checks pass
- [ ] **Verify in browser:** Link appears for admin/manager, hidden for teacher, navigates correctly

## Functional Requirements

- FR-1: The system must display a form showing current nursery timing parameters (dropoff_start, dropoff_end, first_message_time, second_ping_time, timezone)
- FR-2: The form must validate time inputs using Zod schema and display Hebrew error messages for invalid inputs
- FR-3: When a manager or admin submits valid settings, the system must persist changes to the nurseries table via server function
- FR-4: After successful save, the system must display a Hebrew success confirmation message
- FR-5: The settings route must be protected by `requireAuth()` and accessible only to admin and manager roles
- FR-6: The settings link must appear in the sidebar navigation for admin and manager roles only
- FR-7: All UI text must be in Hebrew with RTL layout using logical CSS properties

## Non-Goals (Out of Scope)

- No database migrations or schema changes (nurseries table already has required columns)
- No bulk editing across multiple nurseries
- No preview of when messages will be sent based on configured times
- No advanced scheduling logic or calendar visualization
- No modification of user/role system
- No WhatsApp integration implementation (that's Phase 3)
- No notification system for timing conflicts
- No historical tracking of settings changes

## Technical Considerations

- **Existing patterns:** Follow the 3-tier pattern used for children/parents/teachers:
  1. Schema in `src/lib/schemas/nursery.ts`
  2. Server functions in `src/lib/server/nurseries.ts`
  3. Query hooks in `src/lib/queries/nurseries.ts`
- **Auth flow:** Use `getAccessToken()` from query utils, pass to server function which creates service client
- **Validation:** Zod schema should validate time format (HH:mm) and timezone string
- **Error handling:** Use `getHebrewErrorMessage()` from `src/lib/supabase.ts` for auth errors
- **Route generation:** Dev server must be running when creating new route to regenerate `routeTree.gen.ts`
- **CSS:** Use logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`) for RTL compatibility
- **Hebrew text:** Wrap Hebrew quotes in JSX with `{"..."}` to avoid `react/no-unescaped-entities` lint error

## Success Metrics

- Admin/manager can navigate to settings page in <1 click from any page
- Settings form loads current values in <2 seconds
- Invalid inputs show Hebrew error messages immediately on blur
- Valid submissions save and confirm in <3 seconds
- All quality checks pass on first try
- Zero regressions to existing CRUD pages
- Implementation completed in 2-4 hours

## Open Questions

None. All requirements are clear from existing codebase patterns and the nurseries table schema.
