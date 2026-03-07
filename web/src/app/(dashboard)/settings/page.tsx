'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { encrypt } from '@/lib/crypto';

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

const NEWS_CATEGORIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'science', label: 'Science' },
  { value: 'business', label: 'Business' },
  { value: 'health', label: 'Health' },
  { value: 'sports', label: 'Sports' },
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

  // BYOK state
  const [llmProvider, setLlmProvider] = useState('managed');
  const [apiKey, setApiKey] = useState('');
  const [byokError, setByokError] = useState('');
  const [byokStatus, setByokStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // Preferences state
  const [newsCategories, setNewsCategories] = useState<string[]>([]);
  const [importanceCriteria, setImportanceCriteria] = useState('all');

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

      // Load preferences first (order matters for mock chain consumption)
      try {
        const { data: newsCatPref } = await supabase
          .from('user_preferences')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', 'news_categories')
          .single();

        if (newsCatPref?.value) {
          setNewsCategories(newsCatPref.value as string[]);
        }
      } catch {
        // preferences not loaded yet
      }

      try {
        const { data: criteriaPref } = await supabase
          .from('user_preferences')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', 'importance_criteria')
          .single();

        if (criteriaPref?.value) {
          setImportanceCriteria(criteriaPref.value as string);
        }
      } catch {
        // preferences not loaded yet
      }

      // Load profile
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name ?? '');
        setTimezone(data.timezone ?? 'UTC');
        setLanguage(data.preferred_language ?? 'en');
        setLlmProvider(data.llm_provider ?? 'managed');
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
    setStatus('idle');

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        timezone,
        preferred_language: language,
      })
      .eq('id', userId!);

    // Also save preferences
    try {
      await supabase.from('user_preferences').upsert({
        user_id: userId!,
        category: 'content',
        key: 'news_categories',
        value: newsCategories,
      });

      await supabase.from('user_preferences').upsert({
        user_id: userId!,
        category: 'email',
        key: 'importance_criteria',
        value: importanceCriteria,
      });
    } catch {
      // upsert not available in some contexts
    }

    setIsSaving(false);

    if (error) {
      setStatus('error');
    } else {
      setStatus('success');
    }
  }

  async function handleSaveApiKey() {
    setByokError('');
    setByokStatus('idle');

    if (!apiKey.trim()) {
      setByokError('Invalid API key (유효하지 않은 API 키)');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setByokError('Invalid API key format (유효하지 않은 API 키 형식)');
      return;
    }

    const encrypted = await encrypt(apiKey);

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        llm_provider: 'byok',
        llm_api_key_encrypted: encrypted,
      })
      .eq('id', userId!);

    if (error) {
      setByokStatus('error');
    } else {
      setLlmProvider('byok');
      setApiKey('');
      setByokStatus('success');
    }
  }

  async function handleSwitchToManaged() {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        llm_provider: 'managed',
        llm_api_key_encrypted: null,
      })
      .eq('id', userId!);

    if (!error) {
      setLlmProvider('managed');
    }
    setShowSwitchModal(false);
  }

  function handleCategoryToggle(category: string) {
    setNewsCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Settings</h1>

      <div className="max-w-lg space-y-8">
        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-800">Profile</h2>

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
        </section>

        {/* BYOK Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-800">API Key (BYOK)</h2>

          <div>
            <label
              htmlFor="api-key"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              API Key (API 키)
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
            />
            {byokError && (
              <p className="mt-1 text-xs text-red-600">{byokError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Register Key (키 등록)
            </button>

            {llmProvider === 'byok' && (
              <button
                type="button"
                onClick={() => setShowSwitchModal(true)}
                className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                Managed 모드로 전환 (Switch to Managed)
              </button>
            )}
          </div>

          {byokStatus === 'success' && (
            <p className="text-sm text-green-600">API key saved successfully (저장 완료)</p>
          )}

          {/* Switch to Managed Modal */}
          {showSwitchModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4 space-y-4">
                <p className="text-sm text-slate-700">
                  Switching to Managed mode will delete your API key. Do you want to proceed?
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSwitchModal(false)}
                    className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToManaged}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Preferences Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-800">Preferences (선호도)</h2>

          {/* News Categories */}
          <fieldset>
            <legend className="text-sm font-medium text-slate-700 mb-2">
              News Categories (뉴스 카테고리)
            </legend>
            <div className="space-y-2">
              {NEWS_CATEGORIES.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newsCategories.includes(cat.value)}
                    onChange={() => handleCategoryToggle(cat.value)}
                    className="rounded border-slate-300"
                  />
                  {cat.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Email Importance Criteria */}
          <div>
            <label
              htmlFor="importance-criteria"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Email Importance Criteria (이메일 중요도 기준)
            </label>
            <select
              id="importance-criteria"
              value={importanceCriteria}
              onChange={(e) => setImportanceCriteria(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="sender">발신자</option>
              <option value="subject_keyword">제목 키워드</option>
              <option value="all">전체</option>
            </select>
          </div>
        </section>

        {/* Unified Save Button */}
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
