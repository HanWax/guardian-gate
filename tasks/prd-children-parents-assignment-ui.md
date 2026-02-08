# PRD: Children-Parents Assignment UI

## Introduction

Build a UI to manage the many-to-many relationship between children and parents using the existing `children_parents` junction table. This enables admins and managers to assign/unassign parents to children from both entity detail views, completing the Phase 2 CRUD functionality and unblocking the Phase 3 WhatsApp safety flow.

## Goals

- Enable parent-child assignment from child edit/detail view
- Enable child-parent assignment from parent edit/detail view
- Display existing assignments when editing entities
- Provide unassign functionality with confirmation
- Complete Phase 2 CRUD gaps before Phase 3 implementation

## Tasks

### T-001: Create children_parents server functions and query hooks
**Description:** Implement the 3-tier data layer for managing children_parents junction records: Zod schema for validation, server functions using service-role client, and React Query hooks with cache invalidation.

**Acceptance Criteria:**
- [ ] Create `src/lib/schemas/children-parents.ts` with Zod schemas for create/delete operations
- [ ] Create `src/lib/server/children-parents.ts` with server functions: `getChildrenForParent`, `getParentsForChild`, `assignParentToChild`, `unassignParentFromChild`
- [ ] Create `src/lib/queries/children-parents.ts` with hooks: `useParentsForChild`, `useChildrenForParent`, `useAssignParent`, `useUnassignParent`
- [ ] Mutations invalidate relevant queries (children, parents, and junction queries)
- [ ] Quality checks pass (`npm run lint && npm run test && npm run typecheck`)

### T-002: Add parent assignment UI to child edit view
**Description:** Add a searchable multi-select component to the child edit page that shows currently assigned parents and allows adding/removing parent assignments.

**Acceptance Criteria:**
- [ ] Child edit page displays list of currently assigned parents
- [ ] UI includes searchable dropdown to add new parent assignments (filters existing parents not yet assigned)
- [ ] Each assigned parent shows "remove" button with Hebrew confirmation dialog
- [ ] All labels and messages in Hebrew with RTL layout
- [ ] Uses logical CSS properties (`ps-*`, `pe-*`, `ms-*`, `me-*`)
- [ ] Quality checks pass
- [ ] **Verify in browser:** Can assign parents to a child, can unassign with confirmation, existing assignments load correctly

### T-003: Add children assignment UI to parent edit view
**Description:** Add a searchable multi-select component to the parent edit page that shows currently assigned children and allows adding/removing child assignments.

**Acceptance Criteria:**
- [ ] Parent edit page displays list of currently assigned children
- [ ] UI includes searchable dropdown to add new child assignments (filters existing children not yet assigned)
- [ ] Each assigned child shows "remove" button with Hebrew confirmation dialog
- [ ] All labels and messages in Hebrew with RTL layout
- [ ] Uses logical CSS properties (`ps-*`, `pe-*`, `ms-*`, `me-*`)
- [ ] Quality checks pass
- [ ] **Verify in browser:** Can assign children to a parent, can unassign with confirmation, existing assignments load correctly

### T-004: Add optimistic updates and error handling
**Description:** Enhance UX with optimistic updates for instant feedback and comprehensive Hebrew error messages for assignment operations.

**Acceptance Criteria:**
- [ ] Assignment/unassignment shows optimistic update (immediate UI change)
- [ ] Error states revert optimistic updates and show Hebrew error messages
- [ ] Loading states during server operations
- [ ] Duplicate assignment attempts show helpful Hebrew message
- [ ] Quality checks pass
- [ ] **Verify in browser:** Optimistic updates work, errors display correctly, duplicate prevention works

## Functional Requirements

- FR-1: System must fetch and display all parents currently assigned to a child when editing that child
- FR-2: System must fetch and display all children currently assigned to a parent when editing that parent
- FR-3: Admin/manager can assign an unassigned parent to a child via searchable dropdown from child edit view
- FR-4: Admin/manager can assign an unassigned child to a parent via searchable dropdown from parent edit view
- FR-5: Admin/manager can remove a parent assignment from a child with confirmation dialog
- FR-6: Admin/manager can remove a child assignment from a parent with confirmation dialog
- FR-7: System must prevent duplicate assignments (child-parent pair already exists)
- FR-8: All UI elements (labels, buttons, confirmations, errors) display in Hebrew with RTL layout
- FR-9: Assignment operations use optimistic updates for immediate UI feedback
- FR-10: Failed operations revert optimistic updates and display Hebrew error messages

## Non-Goals (Out of Scope)

- Bulk assignment operations (assign multiple parents to multiple children at once)
- Parent or child creation within the assignment flow
- Assignment management from list views (only from edit/detail views)
- WhatsApp notification integration (Phase 3)
- Assignment history or audit trail
- Database schema changes or migrations
- Role-based permission checks beyond existing admin/manager guards

## Technical Considerations

### Architecture
- Follow existing 3-tier pattern: schema → server → queries
- Server functions use `createServiceClient()` with access token verification
- React Query hooks with proper cache key factories (`childrenParentsKeys`)
- Mutations invalidate: `childrenKeys`, `parentsKeys`, and `childrenParentsKeys`

### Database
- Use existing `children_parents` junction table (no migrations)
- Composite primary key: `(child_id, parent_id)`
- Foreign keys already enforce referential integrity

### UI Components
- Reuse existing patterns from teachers/managers CRUD
- Searchable dropdown similar to nursery selection patterns
- Confirmation dialogs follow existing Hebrew confirmation patterns
- RTL layout with logical CSS properties

### Performance
- Load assignments via React Query (automatic caching)
- Optimistic updates prevent perceived latency
- Filter already-assigned entities client-side to avoid duplicate assignment attempts

## Success Metrics

- Admins/managers can create parent-child links in <5 clicks per assignment
- Existing assignments load and display correctly 100% of the time
- Unassignment requires confirmation (prevents accidental deletions)
- All Hebrew UI text uses correct RTL layout
- Quality checks pass without errors
- Browser testing confirms all CRUD operations work end-to-end

## Open Questions

None - all context provided and constraints are clear. Ready for implementation.
