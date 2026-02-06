# PRD: Managers CRUD

## Introduction

Build complete CRUD functionality for managers following the established pattern from teachers CRUD. This includes list view, create, edit, and delete operations with Hebrew RTL UI. The managers table and RLS policies already exist from Phase 1, so this is purely a frontend implementation task that completes 5 of 6 Phase 2 items and unblocks nursery settings functionality.

## Goals

- Provide admin interface to manage managers at /managers
- Enable creating managers with name, phone, and nursery assignment
- Enable editing existing manager details
- Enable deleting managers with confirmation
- Follow exact patterns from teachers CRUD for consistency
- Complete in 2-4 hours with 3-5 small tasks

## Tasks

### T-001: Create managers list page
**Description:** Implement /managers route displaying all managers with name and assigned nursery in a table/list view, following the teachers list pattern.

**Acceptance Criteria:**
- [ ] Route created at `src/routes/managers/index.tsx`
- [ ] Protected with `requireAuth()` and admin role check
- [ ] Fetches managers from Supabase with nursery join
- [ ] Displays table with columns: name, phone, nursery name
- [ ] Includes "הוסף מנהל" (Add Manager) button linking to /managers/new
- [ ] Shows Hebrew error messages on fetch failure
- [ ] Quality checks pass
- [ ] Verify in browser: table displays, button navigates correctly

### T-002: Create manager creation form
**Description:** Implement /managers/new route with form to create new managers, including name, phone (with Israeli validation), and nursery dropdown.

**Acceptance Criteria:**
- [ ] Route created at `src/routes/managers/new.tsx`
- [ ] Protected with `requireAuth()` and admin role check
- [ ] Form has fields: name (required), phone (required, Israeli format), nursery_id (required dropdown)
- [ ] Phone validation uses same pattern as parents/teachers CRUD
- [ ] Fetches nurseries list for dropdown
- [ ] Submits to Supabase managers table
- [ ] Shows Hebrew success/error messages
- [ ] Redirects to /managers on success
- [ ] Quality checks pass
- [ ] Verify in browser: form validates phone, creates manager, redirects

### T-003: Create manager edit form
**Description:** Implement /managers/$managerId/edit route with pre-filled form to update existing manager details.

**Acceptance Criteria:**
- [ ] Route created at `src/routes/managers/$managerId.edit.tsx`
- [ ] Protected with `requireAuth()` and admin role check
- [ ] Fetches existing manager data on load
- [ ] Pre-fills form with current name, phone, nursery_id
- [ ] Same validation as create form (Israeli phone format)
- [ ] Updates manager in Supabase on submit
- [ ] Shows Hebrew success/error messages
- [ ] Redirects to /managers on success
- [ ] Quality checks pass
- [ ] Verify in browser: form pre-fills, saves changes, redirects

### T-004: Add delete functionality
**Description:** Add delete action to managers list with Hebrew confirmation dialog, following teachers CRUD pattern.

**Acceptance Criteria:**
- [ ] Delete button/icon on each row in managers list
- [ ] Shows Hebrew confirmation dialog: "האם אתה בטוח שברצונך למחוק את המנהל?"
- [ ] Deletes manager from Supabase on confirm
- [ ] Refreshes list on successful delete
- [ ] Shows Hebrew success/error messages
- [ ] Quality checks pass
- [ ] Verify in browser: dialog appears, manager deletes, list refreshes

### T-005: Add navigation and polish
**Description:** Add managers link to main navigation, ensure consistent styling with teachers CRUD, and verify all edge cases.

**Acceptance Criteria:**
- [ ] Add "מנהלים" link to main nav (if not already present)
- [ ] Verify RTL layout works correctly on all pages
- [ ] Verify loading states show during async operations
- [ ] Verify empty state shows when no managers exist
- [ ] Verify all Hebrew text displays correctly
- [ ] Quality checks pass
- [ ] Verify in browser: navigation works, all edge cases handled

## Functional Requirements

- FR-1: The system must display all managers in a table at /managers with columns for name, phone, and assigned nursery
- FR-2: The system must provide a creation form at /managers/new with fields for name, phone (Israeli format), and nursery assignment
- FR-3: When a user enters a phone number, the system must validate it against Israeli phone format (same as parents/teachers)
- FR-4: The system must provide an edit form at /managers/$managerId/edit pre-filled with existing manager data
- FR-5: When a user clicks delete, the system must show a Hebrew confirmation dialog before removing the manager
- FR-6: All manager routes must be protected with requireAuth and require admin role
- FR-7: The system must display all UI text in Hebrew with RTL layout
- FR-8: The system must show Hebrew error messages using getHebrewErrorMessage() for auth/database errors
- FR-9: The system must fetch the nurseries list for the nursery dropdown in create/edit forms
- FR-10: The system must redirect to /managers after successful create/edit operations

## Non-Goals (Out of Scope)

- No database migrations or schema changes to managers table
- No new RLS policies (existing policies from Phase 1 are sufficient)
- No changes to authentication or role checking beyond existing requireAuth/requireRole
- No bulk operations (bulk delete, bulk edit)
- No export/import functionality
- No manager-specific permissions or role hierarchy
- No email notifications for manager creation/deletion
- No audit log for manager changes
- No advanced filtering or search (can be added later if needed)
- No pagination (can be added later if manager list grows large)

## Technical Considerations

- **Database:** Managers table and RLS policies already exist from Phase 1 - no migrations needed
- **Pattern Reuse:** Follow exact structure from teachers CRUD in `src/routes/teachers/` directory
- **Validation:** Use `isValidIsraeliPhone()` from existing validation utilities (same as parents/teachers)
- **Routing:** Use TanStack Router file-based routing with `$managerId` dynamic parameter
- **Auth:** Use `requireAuth()` from `lib/auth-guard.ts` and role check for admin
- **Error Handling:** Use `getHebrewErrorMessage()` from `lib/supabase.ts` for consistent error display
- **Nursery Assignment:** Fetch nurseries from `nurseries` table for dropdown (managers belong to one nursery)

## Success Metrics

- Admin can complete full CRUD lifecycle (create, read, update, delete) for managers in under 2 minutes
- All quality checks (lint, test, typecheck) pass on all new files
- Browser verification confirms all UI flows work correctly
- No database migrations or schema changes required
- Implementation follows exact pattern from teachers CRUD (code reviewers can verify consistency)
- Feature completes 5 of 6 Phase 2 items and unblocks nursery settings work

## Open Questions

None - requirements are clear based on existing teachers CRUD pattern and analysis report recommendations. All necessary database tables and policies exist from Phase 1.
