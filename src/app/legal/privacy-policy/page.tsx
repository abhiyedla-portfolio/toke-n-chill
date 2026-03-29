import { getBrand } from '@/config/brands';

export default function PrivacyPolicyPage() {
  const brand = getBrand();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1
        className="mb-2 text-4xl font-bold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Privacy Policy
      </h1>
      <p className="mb-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Last updated: March 1, 2026
      </p>

      <div
        className="prose-custom space-y-8 text-sm leading-relaxed"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {/* Intro */}
        <p>
          {brand.name} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), operated by Deccan
          Chargers LLC, is committed to protecting your privacy. This Privacy Policy explains how we
          collect, use, and safeguard your information when you visit our website or our retail
          locations in Austin and Leander, Texas.
        </p>

        {/* Section 1 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            1. Information We Collect
          </h2>
          <p className="mb-2">We may collect the following types of information:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Personal Information:</strong> Name, email address, phone number, and any other
              information you voluntarily provide through our contact form or newsletter sign-up.
            </li>
            <li>
              <strong>Age Verification:</strong> We collect confirmation that you are 21 years of age
              or older as required by Texas law.
            </li>
            <li>
              <strong>Usage Data:</strong> Browser type, pages visited, time spent on the site, and
              other anonymized analytics data.
            </li>
            <li>
              <strong>Device Information:</strong> IP address, operating system, and device type for
              security and analytics purposes.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            2. How We Use Your Information
          </h2>
          <p className="mb-2">We use the information we collect to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Respond to inquiries and customer service requests.</li>
            <li>Send promotional communications (only with your opt-in consent).</li>
            <li>Improve our website, products, and in-store experience.</li>
            <li>Comply with legal obligations, including age verification requirements.</li>
            <li>Maintain the security and integrity of our website.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            3. Cookies &amp; Tracking
          </h2>
          <p>
            Our website uses essential cookies to ensure basic functionality such as age verification
            sessions. We may also use anonymized analytics tools to understand how visitors interact
            with the site. We do <strong>not</strong> use third-party advertising trackers or sell
            your data to advertisers.
          </p>
        </section>

        {/* Section 4 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            4. Third Parties
          </h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share
            data with trusted service providers who help us operate our website (e.g., hosting,
            analytics) under strict confidentiality agreements. We may also disclose information when
            required by law.
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            5. Your Rights (CCPA)
          </h2>
          <p className="mb-2">
            If you are a California resident, you have additional rights under the California
            Consumer Privacy Act (CCPA), including:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>The right to know what personal information we collect and how it is used.</li>
            <li>The right to request deletion of your personal information.</li>
            <li>The right to opt out of the sale of your personal information (we do not sell it).</li>
            <li>The right to non-discrimination for exercising your privacy rights.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please contact us using the information below.
          </p>
        </section>

        {/* Section 6 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            6. Data Security
          </h2>
          <p>
            We implement reasonable administrative, technical, and physical safeguards to protect
            your personal information. However, no method of transmission over the Internet is 100%
            secure. We cannot guarantee absolute security.
          </p>
        </section>

        {/* Section 7 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            7. Contact Us
          </h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your rights, please
            contact us at:
          </p>
          <address className="mt-2 not-italic">
            <p>{brand.name}</p>
            <p>
              {brand.store.address}, {brand.store.city}, {brand.store.state} {brand.store.zip}
            </p>
            <p>Phone: {brand.store.phone}</p>
            <p>Email: tokeandchillronaldreagan@gmail.com</p>
          </address>
        </section>
      </div>
    </main>
  );
}
