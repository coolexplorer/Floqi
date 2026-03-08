import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Floqi',
  description: 'Floqi Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 underline">
        &larr; Back to home
      </Link>

      <h1 className="text-3xl font-bold mt-6 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 2026</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Service Description</h2>
          <p>
            Floqi (&ldquo;the Service&rdquo;) is an AI-powered personal automation platform operated by Floqi
            (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). Floqi connects to your existing tools — including
            Google (Gmail, Calendar), Notion, and others — and uses artificial intelligence to automate
            repetitive workflows such as email triage, morning briefings, reading digests, and more.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Account Terms</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You must be at least 13 years old to use Floqi.</li>
            <li>You are responsible for maintaining the security of your account and password.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must provide accurate and complete information when creating your account.</li>
            <li>One person or entity may not maintain more than one free account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Acceptable Use</h2>
          <p className="mb-2">You agree not to use Floqi to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Violate any applicable law or regulation.</li>
            <li>Send spam, phishing, or other unsolicited messages through connected services.</li>
            <li>Attempt to gain unauthorized access to other users&apos; accounts or data.</li>
            <li>Abuse, overload, or interfere with the Service or its infrastructure.</li>
            <li>Use the Service for any purpose that is harmful, fraudulent, or deceptive.</li>
          </ul>
          <p className="mt-2">
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Third-Party Integrations</h2>
          <p>
            Floqi connects to third-party services (Google, Notion, and others) on your behalf. By
            authorizing these connections, you grant Floqi permission to access and interact with your
            data on those platforms as needed to perform your configured automations.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>You may revoke access to any connected service at any time from your settings.</li>
            <li>
              Floqi&apos;s use of Google user data complies with the{' '}
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
            <li>We are not responsible for the availability or behavior of third-party services.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Billing &amp; Subscriptions</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Floqi offers a free tier and a paid Pro plan ($12/month).</li>
            <li>Payments are processed securely through Stripe.</li>
            <li>Pro subscriptions renew automatically each billing cycle unless cancelled.</li>
            <li>You may cancel your subscription at any time. Access continues until the end of the current billing period.</li>
            <li>Refunds are handled on a case-by-case basis. Contact us at support@floqi.com.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
          <p>
            The Service, including its design, code, and branding, is owned by Floqi and protected by
            applicable intellectual property laws. You retain ownership of any data you provide to or
            generate through the Service. By using Floqi, you grant us a limited license to process your
            data solely to provide and improve the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
          <p>
            Floqi is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied. To the
            maximum extent permitted by law, Floqi shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages, or any loss of data, revenue, or profits arising
            from your use of the Service.
          </p>
          <p className="mt-2">
            Because Floqi interacts with your email, calendar, and other services through AI-driven
            automations, you acknowledge that automated actions may occasionally produce unintended
            results. You are responsible for reviewing automation outputs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Termination</h2>
          <p>
            You may delete your account at any time from your account settings. We may suspend or
            terminate your access if you violate these terms or if required by law. Upon termination,
            your data will be deleted in accordance with our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to These Terms</h2>
          <p>
            We may update these Terms of Service from time to time. We will notify you of significant
            changes via email or an in-app notice. Continued use of the Service after changes take effect
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
          <p>
            If you have any questions about these terms, please contact us at{' '}
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
