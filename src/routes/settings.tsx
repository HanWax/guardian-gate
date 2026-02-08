import { useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '~/lib/auth-guard';
import { useNurseries, useNurserySettings, useUpdateNurserySettings } from '~/lib/queries/nurseries';
import Layout from '~/components/Layout';
import { updateNurserySettingsSchema } from '~/lib/schemas/nursery';
import type { NurserySettingsUpdate } from '~/lib/schemas/nursery';

export const Route = createFileRoute('/settings')({
  beforeLoad: () => requireAuth(),
  component: SettingsPage,
});

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Jerusalem', label: 'ישראל (Asia/Jerusalem)' },
  { value: 'UTC', label: 'UTC' },
];

const TIME_FIELDS = [
  { key: 'dropoff_start' as const, label: 'שעת תחילת הגעה' },
  { key: 'dropoff_end' as const, label: 'שעת סיום הגעה' },
  { key: 'first_message_time' as const, label: 'שעת הודעה ראשונה' },
  { key: 'second_ping_time' as const, label: 'שעת תזכורת שנייה' },
];

function SettingsPage() {
  const { data: nurseries, isLoading: nurseriesLoading } = useNurseries();
  const [userSelectedId, setUserSelectedId] = useState('');

  // Derive effective nursery ID: user selection falls back to first nursery
  const selectedNurseryId = userSelectedId || nurseries?.[0]?.id || '';

  const { data: settings, isLoading: settingsLoading } = useNurserySettings(selectedNurseryId);
  const updateMutation = useUpdateNurserySettings();
  const [successMessage, setSuccessMessage] = useState('');

  if (nurseriesLoading) {
    return (
      <Layout>
        <p className="text-gray-500">{"טוען..."}</p>
      </Layout>
    );
  }

  if (!nurseries?.length) {
    return (
      <Layout>
        <p className="text-gray-500">{"לא נמצאו גנים"}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-6">{"הגדרות משתלה"}</h1>

        {nurseries.length > 1 ? (
          <div className="mb-6">
            <label htmlFor="nursery-select" className="block text-sm font-medium text-gray-700 mb-1">
              {"בחירת גן"}
            </label>
            <select
              id="nursery-select"
              value={selectedNurseryId}
              onChange={(e) => setUserSelectedId(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {nurseries.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
        ) : null}

        {settingsLoading ? (
          <p className="text-gray-500">{"טוען הגדרות..."}</p>
        ) : (
          <>
            {successMessage ? (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md" role="status">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            ) : null}
            <NurserySettingsForm
              key={selectedNurseryId}
              initialData={settings ? {
                dropoff_start: settings.dropoff_start ?? '',
                dropoff_end: settings.dropoff_end ?? '',
                first_message_time: settings.first_message_time ?? '',
                second_ping_time: settings.second_ping_time ?? '',
                timezone: settings.timezone ?? 'Asia/Jerusalem',
              } : undefined}
              onSubmit={(data) => {
                setSuccessMessage('');
                updateMutation.mutate({ nurseryId: selectedNurseryId, settings: data }, {
                  onSuccess: () => setSuccessMessage('ההגדרות נשמרו בהצלחה'),
                });
              }}
              isPending={updateMutation.isPending}
              serverError={
                updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : updateMutation.error
                    ? 'שגיאה בעדכון ההגדרות'
                    : null
              }
            />
          </>
        )}
      </div>
    </Layout>
  );
}

function NurserySettingsForm({ initialData, onSubmit, isPending, serverError }: {
  initialData?: NurserySettingsUpdate;
  onSubmit?: (data: NurserySettingsUpdate) => void;
  isPending?: boolean;
  serverError?: string | null;
}) {
  const [formData, setFormData] = useState<NurserySettingsUpdate>(initialData ?? {
    dropoff_start: '',
    dropoff_end: '',
    first_message_time: '',
    second_ping_time: '',
    timezone: 'Asia/Jerusalem',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    const result = updateNurserySettingsSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }
    onSubmit?.(result.data);
  };

  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      ) : null}

      {TIME_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <input
            id={key}
            type="time"
            value={formData[key]}
            onChange={(e) => updateField(key, e.target.value)}
            disabled={isPending}
            className={`block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors[key] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {fieldErrors[key] ? (
            <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors[key]}</p>
          ) : null}
        </div>
      ))}

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
          {"אזור זמן"}
        </label>
        <select
          id="timezone"
          value={formData.timezone}
          onChange={(e) => updateField('timezone', e.target.value)}
          disabled={isPending}
          className={`block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            fieldErrors.timezone ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        {fieldErrors.timezone ? (
          <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.timezone}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {isPending ? 'שומר...' : 'שמירה'}
      </button>
    </form>
  );
}
