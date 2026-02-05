import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/rtl-test')({
  component: RtlTest,
})

function RtlTest() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">בדיקת RTL - Right-to-Left Test</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">טקסט בעברית</h2>
        <p className="text-lg mb-4">
          זהו טקסט לבדיקת כיוון עברי. הטקסט צריך להתחיל מצד ימין ולזרום לצד שמאל.
          המערכת GuardianGate היא מערכת בטיחות לגני ילדים בישראל.
        </p>
        <p className="text-base">
          שורה נוספת של טקסט בעברית כדי לוודא שהכיוון עובד כראוי בכל המקרים.
          כל הטקסט צריך להיות מיושר לימין באופן טבעי.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Navigation Test</h2>
        <div className="flex gap-4 mb-4">
          <button className="px-4 py-2 bg-blue-500 text-white rounded">הקודם</button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded">הבא</button>
        </div>
        <p className="text-sm text-gray-600">
          כפתור &quot;הקודם&quot; צריך להיות בצד ימין, כפתור &quot;הבא&quot; צריך להיות בצד שמאל
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Logical Properties Test</h2>
        <div className="border-inline-start p-4 bg-gray-100 dark:bg-gray-800 mb-4">
          <p>בלוק זה יש גבול בצד ההתחלה (ימין ב-RTL)</p>
        </div>
        <div className="border-inline-end p-4 bg-gray-100 dark:bg-gray-800">
          <p>בלוק זה יש גבול בצד הסיום (שמאל ב-RTL)</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Mixed Content</h2>
        <p className="text-lg mb-2">
          Hebrew: שלום עולם | English: Hello World | Numbers: 1234567890
        </p>
        <p className="text-base">
          URL: https://example.com | Email: test@example.com
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">List Test</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>פריט ראשון ברשימה</li>
          <li>פריט שני ברשימה</li>
          <li>פריט שלישי ברשימה</li>
        </ul>
      </section>
    </div>
  )
}
