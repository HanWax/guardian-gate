import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '~/lib/auth-guard';

export const Route = createFileRoute('/settings')({
  beforeLoad: () => requireAuth(),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4">{"הגדרות משתלה"}</h1>
      <p className="text-gray-600">{"עמוד ההגדרות יבנה בשלב הבא"}</p>
    </div>
  );
}
