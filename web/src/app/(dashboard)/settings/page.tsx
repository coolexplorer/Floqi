'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: 'Korean (한국어)' },
];

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [nameError, setNameError] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name ?? '');
        setTimezone(data.timezone ?? 'UTC');
        setLanguage(data.preferred_language ?? 'en');
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  async function handleSave() {
    if (!displayName.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        timezone,
        preferred_language: language,
      })
      .eq('id', userId!);

    setIsSaving(false);

    if (error) {
      setStatus('error');
    } else {
      setStatus('success');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Settings</h1>

      <div className="max-w-lg space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="display-name"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Name (이름)
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
          />
          {nameError && (
            <p className="mt-1 text-xs text-red-600">{nameError}</p>
          )}
        </div>

        {/* Timezone */}
        <div>
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Timezone (타임존)
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label
            htmlFor="language"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Language (언어)
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save (저장)'}
        </button>

        {/* Status messages */}
        {status === 'success' && (
          <p className="text-sm text-green-600">Saved successfully (저장 완료)</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600">Error: Failed to save (저장 실패)</p>
        )}
      </div>
    </div>
  );
}
