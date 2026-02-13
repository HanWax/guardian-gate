# WhatsApp Messaging Flows — Onboarding Guide

GuardianGate uses WhatsApp to run a daily attendance check-in cycle for Israeli nurseries. Three types of users receive messages: **parents**, **teachers**, and **admins**. All messages are in Hebrew.

---

## Daily Timeline

Each nursery configures three times in its settings. The system checks every few minutes and fires each step within a 5-minute tolerance window.

| Time (configurable) | What happens |
|----------------------|--------------|
| `first_message_time` (~7:00) | Morning check-in sent to all parents |
| `second_ping_time` (~7:45) | Reminder sent to parents who haven't responded |
| `nine_am_check_time` (~9:00) | Teacher summary + unconfirmed arrival alerts |

---

## Step 1 — Morning Check-in

**Trigger:** Cron job at `first_message_time`
**Recipients:** Every parent linked to a child in the nursery

The system creates a `daily_attendance` record for each child, then sends an interactive button message to all of that child's parents:

> בוקר טוב {parentName}! האם {childName} מגיע/ה היום לגן?
> - [✓ בדרך לגן]
> - [✗ לא היום]

If a child has two parents, both receive the message. The first to respond sets the status.

### Parent taps "✓ בדרך לגן" (on the way)

- Attendance is recorded as `dropping_off`
- Parent receives: **תודה, נתראה בקרוב! ✓**

### Parent taps "✗ לא היום" (not today)

- Attendance is recorded as `not_today`
- Parent is asked for an optional explanation:

> תודה. רוצה לשתף פרטים על {childName}?
> - [דלג/י]

- If the parent types a free-text explanation, it is saved and **forwarded to all teachers** in the nursery:

> שלום, התקבלה הודעה מהורה בנוגע להיעדרות היום.
>
> ילד/ה: {childName}
> הורה: {parentName}
>
> הסבר ההורה:
> "{explanation}"
>
> לפרטים נוספים ניתן ליצור קשר בטלפון: {parentPhone}

- If the parent taps "דלג/י" (skip), no explanation is recorded.
- Either way, the parent receives: **תודה! יום טוב ✓**

### Duplicate responses

If a parent taps a button after a response has already been recorded (e.g. the other parent already answered), they receive: **כבר קיבלנו את תשובתך, תודה!**

---

## Step 2 — Second Ping (Reminder)

**Trigger:** Cron job at `second_ping_time`
**Recipients:** Parents whose morning message was sent but who **haven't responded yet**

> תזכורת: אנא אשרו האם {childName} מגיע/ה היום
> - [✓ בדרך לגן]
> - [✗ לא היום]

Response handling is identical to Step 1.

---

## Step 3 — Nine AM Check

**Trigger:** Cron job at `nine_am_check_time`

Two things happen at once:

### Part A — Teacher Summary

**Recipients:** All teachers in the nursery

A plain-text attendance summary is sent:

> סיכום נוכחות - {nurseryName} - {date}
>
> ✓ צפויים להגיע: 5
>   - דני
>   - יעל
>   - ...
>
> ✗ לא מגיעים היום: 2
>   - רותם — חולה
>
> ⚠️ לא ענו: 1
>   - שירה (054-1234567)

Children are sorted into three categories:
- **Expected** — parent said "dropping off"
- **Not coming** — parent said "not today" (with explanation if provided)
- **No response** — no reply from any parent (includes parent phone for follow-up)

### Part B — Unconfirmed Arrival Alerts

**Recipients:** Parents who said "dropping off" but whose child **has not been confirmed by a teacher** yet

> לא אישרנו עדיין את הגעת {childName} ל{nurseryName}. איפה הילד/ה?
> - [בכיתה] (in class)
> - [איתי] (with me)
> - [אחר] (other)

Each response triggers a different sub-flow:

#### Parent taps "בכיתה" (in class)

High-friction verification — the parent must **type the child's name** to confirm:

> לאישור שהילד/ה בכיתה, הקלד/י את שם הילד/ה:

- **Name matches:** System replies **תודה, מעבירים לצוות לבדיקה.** and checks if the teacher actually confirmed arrival. If not, an inconsistency is flagged.
- **Name doesn't match:** Parent gets two more attempts (**השם לא תואם. נסה/י שוב:**). After 3 failures, the system escalates to admin.

#### Parent taps "איתי" (with me)

- If the teacher **has** confirmed the child arrived at nursery, this is an inconsistency and admin is alerted.
- Parent receives: **תודה! יום טוב ✓**

#### Parent taps "אחר" (other)

- System asks: **ספר/י לנו עוד:**
- Parent's free-text response is saved and forwarded to teachers (same format as absence explanations).
- Parent receives: **תודה על השיתוף! יום טוב ✓**

---

## Escalation — Admin Inconsistency Alert

**Recipients:** All admins of the nursery
**Trigger:** A mismatch is detected between what a parent claims and what the teacher status shows

> 🚨 חוסר התאמה ב{nurseryName}
> ילד/ה: {childName}
> ההורה טוען: {parentClaim}
> סטטוס מורה: {teacherStatus}
> 📞 הורה: {parentPhone}
> 📞 צוות: {teacherPhone}

This is sent when:
- Parent says "in class" but teacher hasn't confirmed arrival
- Teacher confirmed arrival but parent says "with me"
- Parent fails name verification 3 times

---

## Who Receives What — Summary

| Role | Messages |
|------|----------|
| **Parents** | Morning check-in, second ping reminder, 9AM unconfirmed alert, confirmation replies, explanation/verification prompts |
| **Teachers** | 9AM attendance summary, forwarded parent explanations |
| **Admins** | Inconsistency escalation alerts |

---

## Technical Notes

- Messages are sent via the **WhatsApp Cloud API** (Meta Graph API v21.0)
- Interactive button messages support up to 3 buttons with a 20-character title limit
- Phone numbers are stored in local format (`054-1234567`) and converted to international format (`972541234567`) before sending
- Each parent has a **conversation state** (`idle`, `awaiting_explanation`, `awaiting_name_verify`, `awaiting_other_explain`) that routes free-text replies to the correct handler
- The `morning_message_runs` table prevents duplicate sends if the cron fires more than once
- All times are evaluated in the nursery's configured timezone (default: `Asia/Jerusalem`)
