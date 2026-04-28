import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">מדיניות פרטיות</h1>
        <p className="text-gray-600 mb-6">עדכון אחרון: אפריל 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. סקירה כללית</h2>
          <p className="text-gray-700 leading-relaxed">
            GuardianGate (להלן: "האפליקציה") היא מערכת בטיחות לילדים עבור גנים ילדים בישראל.
            אנו מתחייבים להגן על הפרטיות של משתמשים שלנו ולעמוד בתקנות הגנת הנתונים החלות.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. נתונים שאנו אוספים</h2>
          <p className="text-gray-700 mb-4">אנו אוספים את הנתונים הבאים:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>מידע חשבון: שם, דוא"ל, מספר טלפון</li>
            <li>מידע ילד: שם, גיל, מזהה ייחודי</li>
            <li>מידע הגעה: זמנים, ימים, סטטוסים</li>
            <li>תקשורת: הודעות דרך WhatsApp (שנשמרות בדטאבייס)</li>
            <li>נתוני שימוש: זמנים, פעולות בתוך האפליקציה</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">3. כיצד אנו משתמשים בנתונים</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>לשליחת התראות בטיחות לחזקים החוקיים</li>
            <li>לניהול מערכת הגן וההגעות</li>
            <li>לשיפור השירות והחוויה</li>
            <li>לתאימות חוקית וביטחון</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">4. אחסון נתונים</h2>
          <p className="text-gray-700 leading-relaxed">
            הנתונים מאוחסנים בשרתי Supabase ומוגנים בהצפנה.
            אנו שומרים נתונים כל עוד יש צורך בהם, ומחקים אותם בהתאם לדרישות החוק.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">5. שיתוף נתונים</h2>
          <p className="text-gray-700 leading-relaxed">
            אנו לא משתפים נתונים עם צדדים שלישיים, מלבד:
            <ul className="list-disc list-inside mt-2">
              <li>ספקי שירותים הנדרשים (Supabase, Vercel)</li>
              <li>Meta (עבור שירות WhatsApp)</li>
              <li>רשויות משפטיות כנדרש בחוק</li>
            </ul>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">6. זכויות המשתמש</h2>
          <p className="text-gray-700 mb-4">יש לך זכות:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>לגשת לנתונים שלך</li>
            <li>לתיקון נתונים שגויים</li>
            <li>למחוק את הנתונים שלך</li>
            <li>להגביל את עיבוד הנתונים</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">7. אבטחה</h2>
          <p className="text-gray-700 leading-relaxed">
            אנו משתמשים בהצפנה וביטחוני תקשורת (HTTPS) להגנה על נתונים.
            עם זאת, אין שיטת שידור בעלת ביטחון 100%.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">8. יצירת קשר</h2>
          <p className="text-gray-700">
            לשאלות בנוגע למדיניות פרטיות זו, אנא צור קשר:
            <br />
            דוא"ל: privacy@guardiangate.local
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">9. שינויים למדיניות זו</h2>
          <p className="text-gray-700 leading-relaxed">
            אנו עשויים לעדכן מדיניות זו מעת לעת. השימוש המתמשך בשירות מהווה הסכמה לשינויים.
          </p>
        </section>

        <div className="border-t pt-8 mt-8">
          <p className="text-sm text-gray-500">
            מדיניות פרטיות זו מיושמת בהתאמה לחוקי הגנת הנתונים בישראל.
          </p>
        </div>
      </div>
    </div>
  )
}
