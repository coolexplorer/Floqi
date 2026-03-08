'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { encrypt } from '@/lib/crypto';
import { Modal } from '@/components/ui/Modal';

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
  const router = useRouter();
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

  // Billing state
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [billingError, setBillingError] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
          .maybeSingle();

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
          .maybeSingle();

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
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name ?? '');
        setTimezone(data.timezone ?? 'UTC');
        setLanguage(data.preferred_language ?? 'en');
        setLlmProvider(data.llm_provider ?? 'managed');
        setPlan(data.plan === 'pro' ? 'pro' : 'free');
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

  if (loading) return <div role="status" aria-live="polite">Loading...</div>;

  return (
    <div className="max-w-2xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s a quick summary of your profile and settings.
        </p>
      </div>

      <div className="space-y-4">
        {/* Data Profile card */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Data Profile</h2>
            <p className="mt-0.5 text-sm text-slate-500">Update your name and personal details.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="display-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Name (이름)
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-600">{nameError}</p>
              )}
            </div>

            <div>
              <dl>
                <dt className="mb-1 block text-sm font-medium text-slate-700">Email</dt>
                <dd className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  —
                </dd>
              </dl>
            </div>
          </div>
        </section>

        {/* Language & Region card */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Language &amp; Region</h2>
            <p className="mt-0.5 text-sm text-slate-500">Set your preferred language and timezone.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="language"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Language (언어)
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="timezone"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Timezone (타임존)
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* BYOK card */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">API Key (BYOK)</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Bring your own Anthropic API key to use your own quota.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="api-key"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                API Key (API 키)
              </label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {byokError && (
                <p className="mt-1 text-xs text-red-600">{byokError}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Register Key (키 등록)
              </button>

              {llmProvider === 'byok' && (
                <button
                  type="button"
                  onClick={() => setShowSwitchModal(true)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Managed 모드로 전환 (Switch to Managed)
                </button>
              )}
            </div>

            {byokStatus === 'success' && (
              <p className="text-sm text-green-600">API key saved successfully (저장 완료)</p>
            )}
          </div>

          {/* Switch to Managed Modal */}
          <Modal
            isOpen={showSwitchModal}
            onClose={() => setShowSwitchModal(false)}
            title="Switch to Managed"
            size="sm"
          >
            <p className="text-sm text-slate-700">
              Switching to Managed mode will delete your API key. Do you want to proceed?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSwitchToManaged}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Confirm
              </button>
            </div>
          </Modal>
        </section>

        {/* Preferences card */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Preferences (선호도)</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Customize your news and email notification preferences.
            </p>
          </div>

          <div className="space-y-4">
            {/* News Categories */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">
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
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email Importance Criteria (이메일 중요도 기준)
              </label>
              <select
                id="importance-criteria"
                value={importanceCriteria}
                onChange={(e) => setImportanceCriteria(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="sender">발신자</option>
                <option value="subject_keyword">제목 키워드</option>
                <option value="all">전체</option>
              </select>
            </div>
          </div>
        </section>

        {/* Billing card */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Billing
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Manage your subscription and billing.</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Current Plan: {plan === 'pro' ? 'Pro' : 'Free'}
            </p>
            <p className="text-sm text-slate-500">
              {plan === 'pro' ? '500' : '30'} executions/month
            </p>

            {plan === 'free' ? (
              <button
                type="button"
                disabled={isUpgrading}
                onClick={async () => {
                  setBillingError('');
                  setIsUpgrading(true);
                  try {
                    const res = await fetch('/api/billing/checkout', { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok) {
                      setBillingError(data.error || 'Payment failed');
                      return;
                    }
                    window.location.href = data.url;
                  } catch {
                    setBillingError('Payment failed');
                  } finally {
                    setIsUpgrading(false);
                  }
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Upgrade to Pro
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setBillingError('');
                  try {
                    const res = await fetch('/api/billing/portal', { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok) {
                      setBillingError(data.error || 'Failed to open billing portal');
                      return;
                    }
                    window.location.href = data.url;
                  } catch {
                    setBillingError('Failed to open billing portal');
                  }
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Manage Plan
              </button>
            )}

            {billingError && (
              <p className="text-sm text-red-600">{billingError}</p>
            )}
          </div>
        </section>

        {/* Danger Zone card */}
        <section className="rounded-xl border border-red-200 bg-red-50/50 p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-red-700">Danger zone</h2>
            <p className="mt-0.5 text-sm text-slate-500">Proceed with caution.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete Account
          </button>

          {deleteError && (
            <p className="mt-2 text-sm text-red-600">{deleteError}</p>
          )}

          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Are you sure?"
            size="sm"
          >
            <p className="text-sm text-slate-700">
              Are you sure? This action cannot be undone. All your data will be permanently deleted.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeleteError('');
                  try {
                    const res = await fetch('/api/account', { method: 'DELETE' });
                    if (!res.ok) {
                      const data = await res.json();
                      setDeleteError(data.error || 'Failed to delete account');
                      setShowDeleteModal(false);
                      return;
                    }
                    router.push('/login');
                  } catch {
                    setDeleteError('Failed to delete account');
                    setShowDeleteModal(false);
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Confirm
              </button>
            </div>
          </Modal>
        </section>

        {/* Unified Save Button + status messages */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save (저장)'}
          </button>

          {status === 'success' && (
            <p className="text-sm text-green-600">Saved successfully (저장 완료)</p>
          )}
          {status === 'error' && (
            <p className="text-sm text-red-600">Error: Failed to save (저장 실패)</p>
          )}
        </div>
      </div>
    </div>
  );
}
