'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.push('/dashboard');
        return;
      }

      if (profile) {
        setTimezone(profile.timezone ?? 'UTC');
        setLanguage(profile.preferred_language ?? 'en');
      }
      setLoading(false);
    }
    checkOnboarding();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({
        timezone,
        preferred_language: language,
        onboarding_completed: true,
      })
      .eq('id', userId);

    router.push('/dashboard');
  }

  if (loading) return <div role="status" aria-live="polite">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Welcome to Floqi</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
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
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

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
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          시작하기 (Get Started)
        </button>
      </form>
    </div>
  );
}
