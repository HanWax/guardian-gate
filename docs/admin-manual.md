# GuardianGate — Admin Manual

This guide covers the full setup and daily operation of GuardianGate, from creating the first admin account through to managing the nursery's WhatsApp message schedule.

---

## Table of Contents

1. [Creating a Nursery](#1-creating-a-nursery)
2. [Adding an Admin (Backend)](#2-adding-an-admin-backend)
3. [Logging In](#3-logging-in)
4. [The Admin Dashboard](#4-the-admin-dashboard)
5. [Managing Teachers](#5-managing-teachers)
6. [Managing Parents](#6-managing-parents)
7. [Managing Children](#7-managing-children)
8. [Configuring Message Schedule](#8-configuring-message-schedule)
9. [Viewing Missing Children](#9-viewing-missing-children)
10. [How the Daily Cycle Works](#10-how-the-daily-cycle-works)

---

## 1. Creating a Nursery

Nurseries are created directly in the database. Each nursery has a name, timezone, and configurable message times.

**Via Supabase SQL Editor or migration:**

```sql
INSERT INTO nurseries (name, dropoff_start, dropoff_end, first_message_time, second_ping_time, nine_am_check_time, timezone)
VALUES (
  'גן שקד',        -- nursery name
  '08:00',          -- drop-off window start
  '09:00',          -- drop-off window end
  '07:30',          -- morning WhatsApp message time
  '08:15',          -- reminder for non-responders
  '09:00',          -- 9am teacher summary + alerts
  'Asia/Jerusalem'  -- timezone
);
```

Note the nursery's `id` (UUID) — you'll need it when adding staff.

---

## 2. Adding an Admin (Backend)

Admin accounts are created in two steps: a Supabase auth user and an `admins` table row linking that user to a nursery.

### Step 1 — Create the auth user

In the Supabase Dashboard, go to **Authentication > Users > Add user** (or use the SQL editor):

- **Email:** the admin's email address
- **Password:** a temporary password (they'll use magic link in production)
- **User metadata:** must include `"role": "admin"`

Via SQL:

```sql
-- Create the auth user
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token,
  is_sso_user, is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),  -- or a specific UUID
  'authenticated', 'authenticated',
  'admin@nursery.com',
  crypt('temp-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"email": "admin@nursery.com", "email_verified": true, "phone_verified": false, "sub": "<same-uuid>", "role": "admin"}',
  '', '', '', '', '', '', '', '', false, false
);

-- Create the matching identity row
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  '<same-uuid>', '<same-uuid>',
  '{"sub": "<same-uuid>", "email": "admin@nursery.com", "email_verified": true}',
  'email', '<same-uuid>',
  now(), now(), now()
);
```

> **Important:** The `raw_user_meta_data` must include `email`, `email_verified`, `phone_verified`, `sub` (the user's UUID), and `role`. The `provider_id` in `auth.identities` should be the user UUID, not the email.

### Step 2 — Link the admin to a nursery

```sql
INSERT INTO admins (nursery_id, phone, name, user_id)
VALUES (
  '<nursery-uuid>',         -- the nursery to manage
  '+972501234567',           -- admin's phone (for WhatsApp escalation alerts)
  'שם המנהל',               -- admin's display name
  '<auth-user-uuid>'        -- from step 1
);
```

The admin is now scoped to that specific nursery. All data they see (children, parents, teachers, attendance) is filtered to their nursery.

---

## 3. Logging In

1. Go to the login page (`/login`).
2. Enter the admin's email address.
3. **Production:** Click "שלח קישור התחברות" (Send login link). A magic link is sent to the email. Click the link to log in.
4. **Local development:** Toggle to password mode ("התחבר עם סיסמה") and enter email + password.

After login, the admin is redirected to the dashboard.

---

## 4. The Admin Dashboard

After logging in, the admin sees the dashboard at `/admin` with the nursery name in the header. The sidebar has five sections:

| Sidebar link | Page | Description |
|-------------|------|-------------|
| **ניהול** (Management) | `/admin` | Dashboard overview with quick links |
| **ילדים חסרים** (Missing children) | `/attendance` | Today's unaccounted-for children |
| **משפחות** (Families) | `/families` | Parents and their children |
| **מורות** (Teachers) | `/teachers` | Teacher staff list |
| **הגדרות משתלה** (Nursery settings) | `/settings` | Message schedule and timezone |

---

## 5. Managing Teachers

**Page:** `/teachers` (admin only)

Teachers are the nursery staff. They receive WhatsApp attendance summaries each morning and parent explanations throughout the day.

### Adding a teacher

1. Click **"+ הוספת מורה"** (Add teacher) at the top of the teachers page.
2. Fill in the form:
   - **שם** (Name) — the teacher's full name (required)
   - **טלפון** (Phone) — Israeli mobile number, e.g. `050-1234567` (required). This is the WhatsApp number where they'll receive attendance summaries.
3. Click **"יצירת מורה"** (Create teacher).

The teacher is automatically linked to the admin's nursery.

### Editing a teacher

Click **"עריכה"** (Edit) next to the teacher's row. Update the name or phone and save.

### Deleting a teacher

Click **"מחיקה"** (Delete) next to the teacher's row, then confirm with **"אישור"** (Confirm).

> **Note:** A teacher can optionally have their own login (a Supabase auth user with `role: "teacher"` linked via `user_id`). Teachers without a login account still receive WhatsApp messages — they just can't access the web dashboard.

---

## 6. Managing Parents

**Page:** `/families` (admin or teacher)

Parents are the people who receive daily WhatsApp check-in messages. Each parent is identified by their phone number (must be unique in the system).

### Adding a parent

1. Click **"הוספת הורה"** (Add parent) — the green button at the top of the families page.
2. Fill in the form:
   - **שם ההורה** (Parent name) — full name (required)
   - **מספר טלפון** (Phone number) — Israeli mobile format, e.g. `05X-XXXXXXX` (required). This is the WhatsApp number where morning check-ins are sent.
3. Click **"שמירה"** (Save).

If the phone number already exists, you'll see an error: "מספר הטלפון כבר קיים במערכת".

### Editing a parent

From the families table, click **"עריכה"** (Edit) next to the parent's row.

### Deleting a parent

Click **"מחיקה"** (Delete), then confirm. This removes the parent and unlinks them from any children.

### Searching

Use the search box at the top to filter by parent name, phone number, or child name.

---

## 7. Managing Children

**Page:** `/families/children/new` (admin only)

Children are linked to a nursery, assigned to a teacher, and connected to one or more parents.

### Adding a child

1. Click **"הוספת ילד/ה"** (Add child) — the blue button on the families page.
2. Fill in the form:
   - **שם הילד/ה** (Child name) — full name (required)
   - **מורה אחראית** (Responsible teacher) — select from the dropdown (required). Every child must be assigned to a teacher.
   - **הורים** (Parents) — search for existing parents by name or phone. Select one or more. Each child must have at least one parent.
3. Click **"שמירה"** (Save).

### Editing a child

From the families page, find the parent row, then navigate to edit the child. You can change the child's name or reassign their teacher.

### How parent-child links work

- A child can have multiple parents (e.g. both mother and father).
- A parent can have multiple children.
- When a morning check-in is sent, **all parents** linked to a child receive the message. The first parent to respond sets the attendance status for that child.

### Recommended setup order

Because children reference both a teacher and parents:

1. **Add teachers first** — so they appear in the teacher dropdown
2. **Add parents** — so they appear in the parent search
3. **Add children** — selecting teacher + parents from the dropdowns

---

## 8. Configuring Message Schedule

**Page:** `/settings` (admin only)

This page controls when WhatsApp messages go out for your nursery. If the admin manages multiple nurseries, a nursery selector appears at the top.

### Settings fields

| Field | Hebrew label | Description | Example |
|-------|-------------|-------------|---------|
| Drop-off start | שעת תחילת הגעה | When the drop-off window opens | `08:00` |
| Drop-off end | שעת סיום הגעה | When the drop-off window closes | `09:00` |
| First message time | שעת הודעה ראשונה | When morning check-in messages are sent to all parents | `07:30` |
| Second ping time | שעת תזכורת שנייה | When reminder messages are sent to parents who haven't responded | `08:15` |
| Nine AM check time | שעת בדיקת נוכחות | When teacher summaries are sent and unconfirmed arrival alerts go out | `09:00` |
| Timezone | אזור זמן | The nursery's timezone (all times are evaluated in this zone) | `Asia/Jerusalem` |

### Typical schedule

For a nursery that opens at 8:00 AM:

| Time | What happens |
|------|-------------|
| **07:30** | Morning check-in sent to all parents: "Is your child coming today?" |
| **08:15** | Reminder sent to parents who didn't respond to the 07:30 message |
| **09:00** | Teacher gets attendance summary. Parents who said "on the way" but whose child hasn't been confirmed get an alert. |

### How to update

1. Navigate to **הגדרות משתלה** (Nursery settings) in the sidebar.
2. Adjust the time fields using the time picker inputs.
3. Click **"שמירה"** (Save).
4. A green banner confirms: "ההגדרות נשמרו בהצלחה" (Settings saved successfully).

Changes take effect on the next cron cycle (within a few minutes).

---

## 9. Viewing Missing Children

**Page:** `/attendance` (admin only)

This page shows today's **missing children** — kids who have not been accounted for. Each row shows:

| Column | Description |
|--------|-------------|
| שם ילד/ה | Child's name |
| הורה | Parent name(s) |
| טלפון הורה | Parent phone number(s) |
| מורה | Assigned teacher name |
| טלפון מורה | Teacher phone number |
| פעולה שננקטה | Action taken so far |

When all children are accounted for, the page shows a green banner: "כל הילדים מזוהים" (All children identified).

---

## 10. How the Daily Cycle Works

For a complete description of the WhatsApp messaging flows — what messages go out, who receives them, and how responses are handled — see the companion document:

**[WhatsApp Messaging Flows](./onboarding-whatsapp-flows.md)**

### Quick summary

1. **Morning** — All parents get a "Is your child coming?" message with Yes/No buttons
2. **Reminder** — Non-responders get a follow-up
3. **9:00 AM** — Teachers get a summary. Parents whose child was expected but not confirmed get an alert.
4. **Escalation** — If there's a mismatch between what a parent says and what the teacher sees, admins get an alert via WhatsApp with both phone numbers to investigate.

The admin's role in the daily cycle is passive — the system handles messaging automatically. Admins only need to act when they receive an inconsistency alert, which means there's a safety concern that requires human follow-up.
