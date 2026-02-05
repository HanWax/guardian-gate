# GuardianGate MVP - Priority Report

## Overview

Child safety check-in system for nurseries. Prevents "forgotten child" fatalities through a closed-loop digital verification system.

---

## Phase 1: Foundation (HIGHEST PRIORITY)

### 1. [HIGH] Initialize TanStack Start project
- Set up TanStack Start with TypeScript
- Configure for Hebrew RTL support
- Basic project structure
- **Status: NOT STARTED**

### 2. [HIGH] Set up Supabase project
- Create new Supabase project
- Configure connection strings
- Set up environment variables
- **Status: NOT STARTED**

### 3. [HIGH] Create database schema + migrations
- Implement full schema from plan (nurseries, children, parents, teachers, managers, daily_attendance, conversation_state)
- Set up RLS policies
- **Status: NOT STARTED**

### 4. [HIGH] Configure Supabase Auth
- Magic link authentication
- Role-based access (admin, manager, teacher)
- **Status: NOT STARTED**

### 5. [MEDIUM] Basic layout/routing
- Hebrew RTL layout
- Navigation structure
- Role-based routing
- **Status: NOT STARTED**

---

## Phase 2: Admin Dashboard

### 6. [MEDIUM] Login page (magic link)
- Supabase auth integration
- Hebrew UI
- **Status: NOT STARTED**

### 7. [MEDIUM] Nursery settings page
- Configure times (dropoff_start, dropoff_end, first_message_time, second_ping_time)
- Timezone settings
- **Status: NOT STARTED**

### 8. [MEDIUM] Children CRUD
- Add/edit/delete children
- Assign to nursery
- **Status: NOT STARTED**

### 9. [MEDIUM] Parents CRUD
- Add/edit/delete parents
- Phone number (WhatsApp)
- Assign to children (many-to-many)
- **Status: NOT STARTED**

### 10. [MEDIUM] Teachers CRUD
- Add/edit/delete teachers
- Assign to nursery
- **Status: NOT STARTED**

### 11. [MEDIUM] Managers CRUD
- Add/edit/delete managers
- Assign to nursery
- **Status: NOT STARTED**

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

## Notes

- Tech Stack: TanStack Start, Supabase, Vercel, Meta WhatsApp Cloud API
- Estimated cost: ~₪200/month (WhatsApp messages only)
- All UI must support Hebrew RTL

*Last updated: 2025-02-05*
