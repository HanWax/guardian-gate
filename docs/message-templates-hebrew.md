# GuardianGate - WhatsApp Message Templates (Hebrew)

## 1. Morning Check-in

**Template ID:** `morning_checkin`

**Text:**
```
בוקר טוב! האם {{child_name}} מגיע/ה היום ל{{nursery_name}}?
```

**Buttons:**
| Button | Hebrew |
|--------|--------|
| ✓ Dropping off | ✓ בדרך |
| ✗ Not today | ✗ לא היום |

---

## 2. Second Ping (No Response Reminder)

**Template ID:** `second_ping`

**Text:**
```
תזכורת: אנא אשרו האם {{child_name}} מגיע/ה היום
```

**Buttons:**
| Button | Hebrew |
|--------|--------|
| ✓ Dropping off | ✓ בדרך |
| ✗ Not today | ✗ לא היום |

---

## 3. Explanation Prompt

**Template ID:** `explanation_prompt`

**Trigger:** After parent selects "Not today"

**Text:**
```
תודה. רוצה לשתף פרטים על {{child_name}}?
```

**Button:**
| Button | Hebrew |
|--------|--------|
| Skip | דלג/י |

---

## 4. Unconfirmed Arrival Alert

**Template ID:** `unconfirmed_alert`

**Trigger:** 9am - Child marked "Expected" but teacher hasn't confirmed arrival

**Text:**
```
לא אישרנו עדיין את הגעת {{child_name}} ל{{nursery_name}}. איפה הילד/ה?
```

**Buttons:**
| Button | Hebrew |
|--------|--------|
| In class | בכיתה |
| With me | איתי |
| Other | אחר |

### Response Flows:

**If parent selects "בכיתה" (In class) → High Friction Verification:**

**Template ID:** `verify_in_class`

```
לאישור שהילד/ה בכיתה, הקלד/י את שם הילד/ה:
```
→ Parent must type child's name

**If name matches:**
```
תודה, מעבירים לצוות לבדיקה.
```
→ System checks teacher status → If not confirmed, **🚨 INCONSISTENCY**

**If name doesn't match:**

**Template ID:** `verify_retry`

```
השם לא תואם. נסה/י שוב:
```
→ Allow 2 more attempts, then escalate to manager

---

**If parent selects "איתי" (With me):**
→ Check teacher status → If confirmed arrived, **🚨 INCONSISTENCY**. Otherwise, resolved.

---

**If parent selects "אחר" (Other):**

**Template ID:** `other_explanation_prompt`

```
ספר/י לנו עוד:
```
→ Free text response forwarded to teacher

---

## 5. Teacher Consolidated List

**Template ID:** `teacher_summary`

**Trigger:** 9am - Sent to teacher

**Text:**
```
סיכום נוכחות - {{nursery_name}} - {{date}}

✓ צפויים להגיע: {{expected_count}}
{{expected_list}}

✗ לא מגיעים היום: {{not_coming_count}}
{{not_coming_list}}

⚠️ לא ענו: {{no_response_count}}
{{no_response_list}}
```

---

## 6. Inconsistency Alert (to Manager)

**Template ID:** `manager_escalation`

**Trigger:** Inconsistency detected between parent claim and teacher status

**Text:**
```
🚨 חוסר התאמה ב{{nursery_name}}
ילד/ה: {{child_name}}
ההורה טוען: {{parent_claim}}
סטטוס מורה: {{teacher_status}}
📞 הורה: {{parent_phone}}
📞 צוות: {{teacher_phone}}
```

---

## 7. Parent Explanation Forward (to Teacher)

**Template ID:** `parent_explanation_forward`

**Trigger:** Parent responds "אחר" with explanation at 9am alert

**Text:**
```
שלום, התקבלה הודעה מהורה בנוגע להיעדרות היום.

ילד/ה: {{child_name}}
הורה: {{parent_name}}

הסבר ההורה:
"{{explanation}}"

לפרטים נוספים ניתן ליצור קשר בטלפון: {{parent_phone}} 📱
```

---

## 8. Confirmation Messages

### After "Dropping off" (single child)

**Template ID:** `confirm_dropping_off`

**Text:**
```
תודה, נתראה בקרוב! ✓
```

### After all children confirmed

**Template ID:** `confirm_complete`

**Text:**
```
תודה! יום טוב ✓
```

---

## Template Variables

| Variable | Description |
|----------|-------------|
| `{{child_name}}` | Child's first name |
| `{{nursery_name}}` | Nursery name |
| `{{date}}` | Current date (DD/MM/YYYY) |
| `{{parent_name}}` | Parent's name |
| `{{parent_phone}}` | Parent's phone number |
| `{{teacher_phone}}` | Teacher's phone number |
| `{{parent_claim}}` | What parent claimed (e.g., "בכיתה", "איתי") |
| `{{teacher_status}}` | Teacher's status (e.g., "לא אושרה הגעה", "אושרה הגעה") |
| `{{explanation}}` | Free text explanation from parent |
| `{{expected_count}}` | Number of expected children |
| `{{expected_list}}` | List of expected children names |
| `{{not_coming_count}}` | Number of children not coming |
| `{{not_coming_list}}` | List with names + explanations |
| `{{no_response_count}}` | Number of non-responders |
| `{{no_response_list}}` | List with names + parent phones |

---

## Notes

- Gender kept neutral for MVP (מגיע/ה, יודע/ת)
- Templates need Meta approval before production use (24-48 hours)
- Interactive buttons require WhatsApp Business API (not regular WhatsApp)
