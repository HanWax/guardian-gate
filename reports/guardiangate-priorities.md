# GuardianGate MVP - Priority Report

## Overview

Child safety check-in system for nurseries. Prevents "forgotten child" fatalities through a closed-loop digital verification system.

## Progress Summary

| Phase | Total | Complete | Remaining |
|-------|-------|----------|-----------|
| Phase 1: Foundation | 5 | 5 | 0 |
| Phase 2: Admin Dashboard | 6 | 6 | 0 |
| Phase 3: WhatsApp Integration | 5 | 0 | 5 |
| Phase 4-8: Remaining | — | 0 | — |

---

## Phase 1: Foundation (HIGHEST PRIORITY)

### 1. [HIGH] Initialize TanStack Start project

- Set up TanStack Start with TypeScript
- Configure for Hebrew RTL support
- Basic project structure
- **Status: COMPLETE**

### 2. [HIGH] Set up Supabase project

- Create new Supabase project
- Configure connection strings
- Set up environment variables
- **Status: COMPLETE**

### 3. [HIGH] Create database schema + migrations

- Implement full schema from plan (nurseries, children, parents, teachers, managers, daily_attendance, conversation_state)
- Set up RLS policies
- **Status: COMPLETE**
- 5 migrations covering all tables: nurseries, children, parents, children_parents, managers, teachers, daily_attendance, conversation_state
- RLS policies with role-based access (admin full access, manager nursery-scoped, teacher attendance-scoped)
- Helper functions: `get_user_role()`, `get_manager_nursery_id()`, `get_teacher_nursery_id()`

### 4. [HIGH] Configure Supabase Auth

- Magic link authentication
- Role-based access (admin, manager, teacher)
- **Status: COMPLETE**
- OTP/magic link flow via Supabase Auth
- Auth context with session management and role extraction
- Route guards: `requireAuth()` and `requireRole()` in `lib/auth-guard.ts`
- Hebrew error translations in `lib/supabase.ts`

### 5. [MEDIUM] Basic layout/routing

- Hebrew RTL layout
- Navigation structure
- Role-based routing
- **Status: COMPLETE**
- File-based routing with TanStack Router
- Sidebar layout with role-aware navigation
- RTL configured in `__root.tsx` (`dir="rtl" lang="he"`)

---

## Phase 2: Admin Dashboard

### 6. [MEDIUM] Login page (magic link)

- Supabase auth integration
- Hebrew UI
- **Status: COMPLETE**
- Route: `/login` with email validation, OTP flow, Hebrew error messages
- Auth callback handler at `/auth/callback`
- Success message directing user to check email

### 7. [MEDIUM] Add missing Teachers nav link and populate dashboard stubs

- Added Teachers CRUD navigation link to admin/manager sidebar
- Populated teacher dashboard with welcome message and view-only quick-access cards
- Populated admin and manager dashboards with DashboardCard components
- **Status: COMPLETE**

### 8. [MEDIUM] Nursery settings page

- Configure times (dropoff_start, dropoff_end, first_message_time, second_ping_time)
- Timezone settings
- **Status: COMPLETE**
- Route: `/settings` with `requireAuth()` guard
- Zod schema validation for HH:mm time format and timezone
- Form with time inputs and timezone dropdown (Asia/Jerusalem default)
- Server function using service-role client with `requireManagerRole()` access
- React Query hooks for fetching and updating nursery settings
- Hebrew labels, error messages, and success feedback
- RTL-compatible styling with logical CSS properties
- Navigation link visible to admin/manager roles only

### 9. [MEDIUM] Children CRUD

- Add/edit/delete children
- Assign to nursery
- **Status: COMPLETE**
- Routes: `/children`, `/children/new`, `/children/$childId/edit`
- Zod validation with Hebrew messages
- ChildForm component with name input
- Full list view with create/edit/delete actions

### 10. [MEDIUM] Parents CRUD

- Add/edit/delete parents
- Phone number (WhatsApp)
- Assign to children (many-to-many)
- **Status: COMPLETE**
- Routes: `/parents`, `/parents/new`, `/parents/$parentId/edit`
- Israeli phone validation (`+972 5` pattern) with formatting
- Search by name or phone number
- Duplicate phone detection
- ParentForm component with name + phone inputs
- Children-parents assignment UI complete (bidirectional assignment with searchable dropdowns)

### 11. [MEDIUM] Teachers CRUD

- Add/edit/delete teachers
- Assign to nursery
- **Status: COMPLETE**
- Routes: `/teachers`, `/teachers/new`, `/teachers/$teacherId/edit`
- Role-restricted to admin/manager
- Server functions via TanStack React Start `createServerFn`
- React Query hooks for data fetching and mutations
- TeacherForm component with name + phone inputs

### 12. [MEDIUM] Managers CRUD

- Add/edit/delete managers
- Assign to nursery
- **Status: COMPLETE**
- Routes: `/managers`, `/managers/new`, `/managers/$managerId/edit`
- Zod schema validation with Israeli phone format
- ManagerForm component with name, phone, and nursery dropdown
- Server functions and React Query hooks for all CRUD operations
- Inline delete confirmation with Hebrew dialog
- Admin-only access via `requireAuth()` guard
- Navigation link added for admin users

---

## Phase 3: WhatsApp Integration

### 12. [HIGH] Meta Cloud API setup

- Business verification
- API credentials
- Webhook configuration
- **Status: NOT STARTED**

### 13. [HIGH] Webhook endpoint for incoming messages

- Supabase Edge Function
- Message parsing
- **Status: NOT STARTED**

### 14. [HIGH] Message sending functions

- Template message sending
- Error handling
- **Status: NOT STARTED**

### 15. [MEDIUM] Template registration with Meta

- Submit 11 templates for approval (see message-templates-hebrew.md)
- **Status: NOT STARTED**

### 16. [HIGH] Conversation state management

- Track parent conversation flow
- Handle sequential child messaging
- **Status: NOT STARTED**

---

## Phase 4-8: Remaining Phases

See docs/plan.md for full details on:

- Phase 4: Morning Flow
- Phase 5: Teacher Dashboard
- Phase 6: 9am Safety Loop
- Phase 7: Inconsistency Handling
- Phase 8: Testing & Pilot

---

## Next Up (Recommended Order)

1. **Phase 3: WhatsApp Integration** — core safety flow depends on this

---

## Notes

- Tech Stack: TanStack Start, Supabase, Vercel, Meta WhatsApp Cloud API
- Estimated cost: ~₪200/month (WhatsApp messages only)
- All UI must support Hebrew RTL
- Dashboard pages (`/admin`, `/manager`, `/teacher`) populated with quick-access cards

*Last updated: 2026-02-08*

---

**Completion Summary (17/17 tasks completed)**
- All Phase 1 Foundation tasks: ✅ Complete
- All Phase 2 Admin Dashboard tasks: ✅ Complete
- Phase 3 WhatsApp Integration: Upcoming (5 tasks remaining)
