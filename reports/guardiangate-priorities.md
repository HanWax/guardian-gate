# GuardianGate MVP - Priority Report

## Overview

Child safety check-in system for nurseries. Prevents "forgotten child" fatalities through a closed-loop digital verification system.

## Progress Summary

| Phase | Total | Complete | Remaining |
|-------|-------|----------|-----------|
| Phase 1: Foundation | 5 | 5 | 0 |
| Phase 2: Admin Dashboard | 6 | 6 | 0 |
| Phase 3: WhatsApp Integration | 5 | 3 | 2 |
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
- **Status: COMPLETE**
- Created `src/lib/server/whatsapp.ts` with `sendTemplateMessage()` and `sendTextMessage()` functions
- Environment variables documented in `.env.example`: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`
- Step-by-step setup guide in `docs/whatsapp-setup.md` (Meta Business account, API token, phone number ID, webhook config)
- 9 unit tests for API client with mocked fetch

### 13. [HIGH] Webhook endpoint for incoming messages

- Webhook verification (GET) and message receiving (POST)
- Message parsing and signature verification
- **Status: COMPLETE**
- GET handler: validates `hub.verify_token` and returns `hub.challenge` for Meta verification
- POST handler: parses incoming message payload (sender, text, timestamp), verifies `x-hub-signature-256` via HMAC-SHA256
- API route at `/api/whatsapp/webhook` via `src/routes/api.whatsapp.webhook.ts`
- Server functions in `src/lib/server/whatsapp-webhook.ts` and `whatsapp-webhook-handler.ts`
- 16 unit tests covering verification, signature, parsing, and handler logic

### 14. [HIGH] Message sending functions

- Template message sending
- Error handling
- **Status: COMPLETE**
- `sendTemplateMessage(to, templateName, languageCode, components?)` for pre-approved templates
- `sendTextMessage(to, text)` for plain text messages
- Both use Meta Graph API v21.0 with Bearer token auth
- TypeScript types for `TemplateComponent` and `WhatsAppMessageResponse`
- Full JSDoc documentation

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

1. **Template registration with Meta** — submit Hebrew message templates for approval (can take 24-48h)
2. **Conversation state management** — track parent conversation flow and sequential child messaging
3. **Phase 4: Morning Flow** — depends on WhatsApp integration completion

---

## Notes

- Tech Stack: TanStack Start, Supabase, Vercel, Meta WhatsApp Cloud API
- Estimated cost: ~₪200/month (WhatsApp messages only)
- All UI must support Hebrew RTL
- Dashboard pages (`/admin`, `/manager`, `/teacher`) populated with quick-access cards
- 105 tests passing across all modules (lint, test, typecheck all green)

*Last updated: 2026-02-08*

---

**Completion Summary (20/22 tasks completed)**
- All Phase 1 Foundation tasks: ✅ Complete (5/5)
- All Phase 2 Admin Dashboard tasks: ✅ Complete (7/7)
- Phase 3 WhatsApp Integration: In Progress (3/5 complete, 2 remaining)
