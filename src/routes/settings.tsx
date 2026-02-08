import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '~/lib/auth-guard';
import { useNurseries, useNurserySettings } from '~/lib/queries/nurseries';
import Layout from '~/components/Layout';
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
          <NurserySettingsForm
            key={selectedNurseryId}
            initialData={settings ? {
              dropoff_start: settings.dropoff_start ?? '',
              dropoff_end: settings.dropoff_end ?? '',
              first_message_time: settings.first_message_time ?? '',
              second_ping_time: settings.second_ping_time ?? '',
              timezone: settings.timezone ?? 'Asia/Jerusalem',
            } : undefined}
          />
        )}
      </div>
    </Layout>
  );
}

function NurserySettingsForm({ initialData }: { initialData?: NurserySettingsUpdate }) {
  const [formData, setFormData] = useState<NurserySettingsUpdate>(initialData ?? {
    dropoff_start: '',
    dropoff_end: '',
    first_message_time: '',
    second_ping_time: '',
    timezone: 'Asia/Jerusalem',
  });

  return (
    <form className="space-y-4">
      {TIME_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <input
            id={key}
            type="time"
            value={formData[key]}
            onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      ))}

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
          {"אזור זמן"}
        </label>
        <select
          id="timezone"
          value={formData.timezone}
          onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>
    </form>
  );
}
