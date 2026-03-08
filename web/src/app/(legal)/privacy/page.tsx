import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Floqi',
  description: 'Floqi Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 underline">
        &larr; Back to home
      </Link>

      <h1 className="text-3xl font-bold mt-6 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 2026</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Data We Collect</h2>
          <p className="mb-2">We collect the following types of information:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account information:</strong> email address, name, timezone, and language
              preference provided during registration.
            </li>
            <li>
              <strong>OAuth tokens:</strong> access and refresh tokens for connected services (Google,
              Notion) required to execute automations on your behalf.
            </li>
            <li>
              <strong>Execution logs:</strong> records of automation runs including timestamps, status,
              and summary outputs.
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, features used, and general interaction
              patterns to improve the Service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To provide and operate the Service, including running your configured automations.</li>
            <li>To process billing and manage your subscription through Stripe.</li>
            <li>To send transactional emails (e.g., automation summaries, account notifications).</li>
            <li>To improve and develop new features based on aggregated, anonymized usage patterns.</li>
            <li>To ensure the security and integrity of the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Third-Party Services</h2>
          <p className="mb-2">We use the following third-party services to operate Floqi:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Supabase:</strong> authentication, database hosting, and row-level security for
              data isolation.
            </li>
            <li>
              <strong>Anthropic Claude API:</strong> AI processing for automation execution. Your data
              is sent to Claude only during active automation runs and is not used for model training.
            </li>
            <li>
              <strong>Google APIs:</strong> Gmail and Calendar access for automations you configure.
              Floqi&apos;s use of Google data complies with the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </li>
            <li>
              <strong>Stripe:</strong> payment processing. We do not store your credit card details —
              Stripe handles all payment data.
            </li>
            <li>
              <strong>Notion API:</strong> reading and writing to your Notion workspace as configured
              in your automations.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Security</h2>
          <p>We take the security of your data seriously:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              OAuth tokens are encrypted at rest using <strong>AES-256-GCM</strong> encryption.
            </li>
            <li>
              All database access is protected by Supabase <strong>Row Level Security (RLS)</strong>,
              ensuring users can only access their own data.
            </li>
            <li>All data in transit is encrypted via <strong>HTTPS/TLS</strong>.</li>
            <li>We follow the principle of least privilege for all service integrations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Execution logs</strong> are retained for 90 days, after which they are
              automatically deleted.
            </li>
            <li>
              <strong>Account data</strong> (profile, preferences, connected services) is kept until
              you delete your account.
            </li>
            <li>
              Upon account deletion, all your data — including OAuth tokens, execution logs, and
              automation configurations — is permanently removed within 30 days.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Access</strong> your data — view all information we hold about you from your
              account settings.
            </li>
            <li>
              <strong>Delete</strong> your account and all associated data at any time.
            </li>
            <li>
              <strong>Export</strong> your data — request a copy of your data by contacting us.
            </li>
            <li>
              <strong>Revoke</strong> access to any connected third-party service at any time.
            </li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, visit your account settings or contact us at{' '}
            <a href="mailto:support@floqi.com" className="text-blue-600 hover:underline">
              support@floqi.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookies</h2>
          <p>
            Floqi uses minimal cookies. We only use essential cookies required for authentication
            (Supabase auth session cookies). We do not use advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children&apos;s Privacy</h2>
          <p>
            Floqi is not intended for children under the age of 13. We do not knowingly collect
            personal information from children under 13. If you believe a child under 13 has provided
            us with personal information, please contact us and we will promptly delete it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes via email or an in-app notice. Continued use of the Service after changes take
            effect constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:support@floqi.com" className="text-blue-600 hover:underline">
              support@floqi.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
