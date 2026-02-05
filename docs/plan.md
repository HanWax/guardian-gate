# GuardianGate MVP - Full Plan

## Problem Statement

Prevent "forgotten child" fatalities in transport by creating a closed-loop, high-accountability digital check-in system. GuardianGate creates a mandatory "handshake" between parents and staff, ensuring that if a child is not physically accounted for by a set time, a high-intensity communication loop is forced between all guardians until safety is confirmed.

---

## Core Principles

1. **Redundant safety** - Both parent AND teacher must confirm; system doesn't rely on single point of failure
2. **Automated alerts** - Even if teacher forgets to call, parents get automated notifications
3. **Inconsistency detection** - Conflicting claims between parent and teacher trigger immediate escalation
4. **Blocking resolution** - Inconsistencies must be resolved before continuing; cannot be dismissed

---

## User Roles

| Role | Access | Capabilities |
|------|--------|--------------|
| **Admin** | Dashboard | System setup, manage nurseries, add managers/teachers |
| **Manager** | Dashboard + WhatsApp | Receives escalations, resolves blocked states, oversees teachers |
| **Teacher** | Dashboard + WhatsApp | Daily attendance, marks arrivals, calls parents, receives alerts |
| **Parent** | WhatsApp only | Responds to check-in messages |

- Manager and Teacher are separate people (cannot be same person)
- Each nursery has: 1 manager, 1+ teachers, many parents/children

---

## Daily Flow

### Phase 1: Morning Check-in (7:30am - configurable)

**System → Parent (WhatsApp, sequential per child):**

```
בוקר טוב! האם {{child_name}} מגיע/ה היום ל{{nursery_name}}?
[✓ בדרך] [✗ לא היום]
```

| Parent Response | Next Step |
|-----------------|-----------|
| "בדרך" (Dropping off) | Confirm message, move to next child |
| "לא היום" (Not today) | Prompt for optional explanation, move to next child |
| No response | Second ping at configurable time |
| Still no response | Added to "unaccounted" list |

**If parent has multiple children:** Sequential messages, one per child, each requires explicit response.

---

### Phase 2: Dropoff Window (8:00am - 9:00am - configurable)

**Teacher Dashboard:**
- Live list of expected children (from parent responses)
- Teacher marks each child as arrived: `☐ → ☑`
- Can see "Not coming" list with explanations
- Can see "Unaccounted" list with parent phone numbers

---

### Phase 3: Safety Triggers (9:00am - configurable)

Two parallel mechanisms fire simultaneously:

#### A. Teacher Consolidated List

```
סיכום נוכחות - {{nursery_name}} - {{date}}

✓ צפויים ({{expected_count}}):
☐ דניאל כהן
☐ מיכל לוי
☐ יונתן אברהם

✗ לא מגיעים ({{not_coming_count}}):
• נועה גולן - "רופא שיניים עד 10:00"
• אורי שמש - לא פירט

⚠️ לא ענו ({{no_response_count}}):
• תמר בן דוד - 📞 052-1234567
• עידו פרץ - 📞 054-9876543
```

#### B. Automated Parent Alerts

For each child where:
- Parent said "בדרך" (Dropping off) in morning, AND
- Teacher has NOT confirmed arrival

**System → Parent (WhatsApp):**

```
לא אישרנו עדיין את הגעת {{child_name}} ל{{nursery_name}}. איפה הילד/ה?
[בכיתה] [איתי] [אחר]
```

| Parent Response | System Action |
|-----------------|---------------|
| "בכיתה" (In class) | **High friction:** Prompt parent to type child's name → If correct, check teacher status → If not confirmed, **🚨 INCONSISTENCY** |
| "איתי" (With me) | Check teacher status → If confirmed arrived, **🚨 INCONSISTENCY**. Otherwise, resolved. |
| "אחר" (Other) | Prompt for explanation → Forward to teacher with call button |

**High Friction Verification (for "בכיתה"):**
- Parent must type child's name to confirm
- Prevents mindless button tapping
- 3 attempts allowed, then escalates to manager

---

### Phase 4: Inconsistency Handling

#### All Inconsistency Scenarios

| Morning (Parent) | Teacher Status | 9am (Parent) | Inconsistency? |
|------------------|----------------|--------------|----------------|
| "בדרך" (Dropping off) | Not arrived | "בכיתה" (In class) | 🚨 YES |
| "בדרך" (Dropping off) | Arrived | "איתי" (With me) | 🚨 YES |
| "לא היום" (Not today) | Arrived | — | 🚨 YES |
| No response | Not arrived | "בכיתה" (In class) | 🚨 YES |

#### Escalation Flow

```
Inconsistency detected
        ↓
┌─────────────────────────────────────┐
│  🚨 Teacher dashboard BLOCKED       │
│  "יש לפתור לפני המשך"               │
│                                     │
│  דניאל כהן - חוסר התאמה             │
│  ההורה טוען: בכיתה                  │
│  סטטוס מורה: לא אושרה הגעה          │
│                                     │
│  [📞 התקשר להורה]                   │
└─────────────────────────────────────┘
        ↓
  Simultaneously
        ↓
┌─────────────────────────────────────┐
│  Manager receives WhatsApp alert    │
│                                     │
│  🚨 חוסר התאמה ב{{nursery_name}}     │
│  ילד/ה: {{child_name}}              │
│  📞 הורה: {{parent_phone}}          │
│  📞 צוות: {{teacher_phone}}         │
└─────────────────────────────────────┘
```

#### Resolution Options

Either Teacher or Manager can resolve:

| Resolution | Hebrew | Meaning |
|------------|--------|---------|
| Child in class | ✓ הילד נמצא בכיתה | Teacher missed them on arrival |
| Child with parent | ✓ הילד עם ההורה | Confirmed safe with parent |
| Other | ✓ אחר + הסבר | Requires free text explanation |

Once resolved → Dashboard unblocked, day continues.

---

## Tech Stack

| Layer | Choice | Cost |
|-------|--------|------|
| Framework | TanStack Start | Free |
| Database | Supabase (PostgreSQL) | Free tier |
| Auth | Supabase Auth | Free tier |
| Scheduling | Supabase pg_cron + Edge Functions | Free tier |
| WhatsApp API | Meta Cloud API direct | ~₪200/mo per 100 kids |
| Hosting | Vercel | Free tier |

**Total estimated cost: ~₪200/month** (WhatsApp messages only)

---

## Database Schema

```sql
-- Nurseries
nurseries (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  dropoff_start TIME NOT NULL,        -- e.g., 08:00
  dropoff_end TIME NOT NULL,          -- e.g., 09:00
  first_message_time TIME NOT NULL,   -- e.g., 07:30
  second_ping_time TIME NOT NULL,     -- e.g., 08:15
  timezone TEXT DEFAULT 'Asia/Jerusalem',
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Children
children (
  id UUID PRIMARY KEY,
  nursery_id UUID REFERENCES nurseries(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Parents
parents (
  id UUID PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,         -- WhatsApp number
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Children-Parents (many-to-many)
children_parents (
  child_id UUID REFERENCES children(id),
  parent_id UUID REFERENCES parents(id),
  PRIMARY KEY (child_id, parent_id)
)

-- Managers
managers (
  id UUID PRIMARY KEY,
  nursery_id UUID REFERENCES nurseries(id),
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),  -- Supabase auth
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Teachers
teachers (
  id UUID PRIMARY KEY,
  nursery_id UUID REFERENCES nurseries(id),
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),  -- Supabase auth
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Daily Attendance
daily_attendance (
  id UUID PRIMARY KEY,
  child_id UUID REFERENCES children(id),
  date DATE NOT NULL,

  -- Morning check-in
  parent_response TEXT CHECK (parent_response IN ('dropping_off', 'not_today')),
  parent_response_time TIMESTAMPTZ,
  parent_explanation TEXT,

  -- Teacher confirmation
  teacher_confirmed BOOLEAN DEFAULT FALSE,
  teacher_confirmed_time TIMESTAMPTZ,
  teacher_confirmed_by UUID REFERENCES teachers(id),

  -- 9am alert response
  nine_am_alert_sent BOOLEAN DEFAULT FALSE,
  nine_am_parent_response TEXT CHECK (nine_am_parent_response IN ('in_class', 'with_me', 'other')),
  nine_am_explanation TEXT,

  -- Inconsistency tracking
  inconsistency BOOLEAN DEFAULT FALSE,
  inconsistency_type TEXT,
  inconsistency_resolved BOOLEAN DEFAULT FALSE,
  inconsistency_resolved_by UUID,  -- teacher_id or manager_id
  inconsistency_resolved_at TIMESTAMPTZ,
  inconsistency_resolution TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, date)
)

-- Conversation state (for WhatsApp flow)
conversation_state (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES parents(id),
  current_child_index INTEGER DEFAULT 0,
  state TEXT,  -- 'awaiting_checkin', 'awaiting_explanation', 'awaiting_9am_response', 'awaiting_name_verification', etc.
  verification_attempts INTEGER DEFAULT 0,  -- For high friction name verification (max 3)
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

## Dashboard Screens

### Admin Screens

| Screen | Purpose |
|--------|---------|
| Login | Supabase magic link auth |
| Nurseries | CRUD nurseries (for multi-nursery future) |
| Settings | Nursery name, times, timezone |

### Manager Screens

| Screen | Purpose |
|--------|---------|
| Dashboard | Overview, active alerts, inconsistencies |
| Teachers | CRUD teachers |
| Children | CRUD children |
| Parents | CRUD parents, assign to children |
| Alerts | View/resolve escalated inconsistencies |

### Teacher Screens

| Screen | Purpose |
|--------|---------|
| Attendance | Today's list - mark arrivals, see statuses |
| Blocked State | Inconsistency resolution (cannot navigate away) |

---

## WhatsApp Message Templates

See: [message-templates-hebrew.md](./message-templates-hebrew.md)

Templates requiring Meta approval:
1. `morning_checkin` - Morning check-in with buttons
2. `second_ping` - Reminder for non-responders
3. `explanation_prompt` - After "not today"
4. `unconfirmed_alert` - 9am alert with buttons
5. `verify_in_class` - High friction: type child's name to confirm
6. `verify_retry` - Name didn't match, try again
7. `teacher_summary` - Consolidated list
8. `manager_escalation` - Inconsistency alert
9. `parent_explanation_forward` - Forward explanation to teacher
10. `confirm_dropping_off` - Acknowledgment
11. `confirm_complete` - All children confirmed

---

## Scheduled Jobs (pg_cron)

| Job | Time | Action |
|-----|------|--------|
| `morning_checkin` | `first_message_time` | Send check-in to all parents |
| `second_ping` | `second_ping_time` | Ping non-responders |
| `nine_am_triggers` | `dropoff_end` | Send teacher list + parent alerts |

---

## Build Order

### Phase 1: Foundation
- [ ] Initialize TanStack Start project
- [ ] Set up Supabase project
- [ ] Create database schema + migrations
- [ ] Configure Supabase Auth
- [ ] Basic layout/routing

### Phase 2: Admin Dashboard
- [ ] Login page (magic link)
- [ ] Nursery settings page
- [ ] Children CRUD
- [ ] Parents CRUD
- [ ] Teachers CRUD
- [ ] Managers CRUD

### Phase 3: WhatsApp Integration
- [ ] Meta Cloud API setup
- [ ] Webhook endpoint for incoming messages
- [ ] Message sending functions
- [ ] Template registration with Meta
- [ ] Conversation state management

### Phase 4: Morning Flow
- [ ] pg_cron job for morning check-in
- [ ] Sequential child messaging logic
- [ ] Parent response handling
- [ ] Second ping job
- [ ] Explanation capture

### Phase 5: Teacher Dashboard
- [ ] Attendance list view
- [ ] Mark arrival functionality
- [ ] Real-time updates (Supabase realtime)
- [ ] Expected/Not coming/Unaccounted sections

### Phase 6: 9am Safety Loop
- [ ] pg_cron job for 9am triggers
- [ ] Consolidated teacher list (WhatsApp)
- [ ] Automated parent alerts
- [ ] Parent response handling (in_class/with_me/other)
- [ ] Explanation forwarding to teacher

### Phase 7: Inconsistency Handling
- [ ] Inconsistency detection logic
- [ ] Teacher dashboard blocking
- [ ] Manager escalation alerts
- [ ] Resolution flow
- [ ] Unblocking on resolution

### Phase 8: Testing & Pilot
- [ ] End-to-end flow testing
- [ ] Pilot nursery onboarding
- [ ] Real-world testing
- [ ] Iterate based on feedback

---

## Open Items

| Item | Notes |
|------|-------|
| Meta Business verification | Required for WhatsApp API production access |
| Template approval | 24-48 hours per template |
| Pilot nursery | Need to identify for testing |
| Phone number | Need dedicated WhatsApp Business number |

---

## Out of Scope (MVP)

- Multiple nurseries per account
- Incident audit trail / reporting
- Automatic timeout escalation
- Gender-specific messaging
- Native mobile app
- Multi-language support
