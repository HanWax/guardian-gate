# PRD: Children-Parents Assignment UI

## Introduction

Build a UI to manage parent-child relationships using the existing `children_parents` junction table. This enables admins to link children to parents from the parent edit/detail page, which is critical infrastructure for Phase 3 (WhatsApp messaging flow) where the system needs to know which parent to message about which child.

## Goals

- Display currently assigned children for each parent
- Enable admins to add child assignments to a parent via multi-select
- Enable admins to remove child assignments from a parent
- Persist all changes to the `children_parents` junction table
- Follow existing Hebrew RTL layout and Supabase patterns

## Tasks

### T-001: Create Supabase helper functions for child assignments
**Description:** Add helper functions to read and write `children_parents` junction table data using the Supabase client.

**Acceptance Criteria:**
- [ ] Function to fetch assigned children for a parent ID
- [ ] Function to add child-parent assignment (insert to junction table)
- [ ] Function to remove child-parent assignment (delete from junction table)
- [ ] TypeScript types for junction table operations
- [ ] Quality checks pass (lint, test, typecheck)

### T-002: Add child assignment section to parent edit page
**Description:** Extend the parent edit page UI to display currently assigned children and provide controls for managing assignments.

**Acceptance Criteria:**
- [ ] Section shows list of currently assigned children (names displayed)
- [ ] Section appears on parent edit page below main form
- [ ] Hebrew labels and RTL layout consistent with existing UI
- [ ] Empty state shows when no children assigned
- [ ] Quality checks pass
- [ ] Verify in browser: section renders correctly in Hebrew RTL

### T-003: Implement multi-select child assignment UI
**Description:** Add a multi-select dropdown/picker that lets admins select children to assign to the current parent.

**Acceptance Criteria:**
- [ ] Multi-select component shows all available children
- [ ] Currently assigned children are pre-selected/disabled or marked
- [ ] Selecting children and saving persists to `children_parents` table
- [ ] Removing selections deletes junction table rows (not child records)
- [ ] Success/error feedback shown after save
- [ ] Quality checks pass
- [ ] Verify in browser: can add/remove assignments successfully

### T-004: Add browser tests for assignment flow
**Description:** Write browser tests to verify the assignment UI works end-to-end.

**Acceptance Criteria:**
- [ ] Test: Navigate to parent edit and see assigned children section
- [ ] Test: Add a child assignment and verify persistence
- [ ] Test: Remove a child assignment and verify deletion
- [ ] Test: Verify child and parent records remain intact after assignment changes
- [ ] All tests pass
- [ ] Quality checks pass

## Functional Requirements

- FR-1: The parent edit page must display a "Assigned Children" section showing all children currently linked to this parent via the `children_parents` table
- FR-2: The UI must provide a multi-select control to add new child assignments
- FR-3: When an admin selects children and saves, the system must insert rows into `children_parents` with `parent_id` and `child_id`
- FR-4: The UI must allow removing child assignments (e.g., via remove button or deselecting)
- FR-5: When an assignment is removed, the system must delete the corresponding row from `children_parents` without affecting the child or parent record
- FR-6: All labels and UI text must be in Hebrew
- FR-7: The UI must follow RTL layout patterns consistent with the rest of the application

## Non-Goals (Out of Scope)

- No database migrations or schema changes (junction table already exists)
- No bulk assignment (e.g., assign one child to multiple parents at once)
- No modifications to children CRUD pages
- No modifications to parent list page (only edit/detail page)
- No WhatsApp integration (that's Phase 3, separate feature)
- No parent-side validation beyond basic foreign key constraints (e.g., preventing duplicate assignments is handled by DB unique constraint)

## Technical Considerations

- **Existing Schema:** The `children_parents` table already exists with `parent_id` and `child_id` columns and a unique constraint
- **Supabase Client:** Use existing Supabase client patterns from `lib/supabase.ts`
- **Routing:** Parent edit page is at `/parents/$parentId/edit` (TanStack file-based routing)
- **Hebrew RTL:** All UI must follow existing Hebrew RTL patterns from `__root.tsx`
- **Quality Checks:** Must pass lint, test, and typecheck per `compound.config.json`

## Success Metrics

- Admins can view assigned children in <2 clicks from parent list
- Admins can add/remove child assignments with immediate visual feedback
- All changes persist correctly to `children_parents` table
- Zero breaking changes to existing parent/children CRUD functionality
- Browser tests confirm end-to-end flow works in production-like environment

## Open Questions

- None (all context provided, constraints clear, scope well-defined)
