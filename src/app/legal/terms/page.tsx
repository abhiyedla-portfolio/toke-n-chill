import { getBrand } from '@/config/brands';

export default function TermsPage() {
  const brand = getBrand();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1
        className="mb-2 text-4xl font-bold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Terms of Use
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
          Welcome to the {brand.name} website. By accessing or using this website, you agree to be
          bound by these Terms of Use. If you do not agree, please do not use this site. This
          website is operated by Deccan Chargers LLC.
        </p>

        {/* Section 1 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            1. Age Requirement
          </h2>
          <p>
            You must be at least <strong>21 years of age</strong> to access this website and
            purchase any products from our stores. By using this site, you confirm that you meet
            this age requirement. We reserve the right to request proof of age at any time, both
            online and in-store.
          </p>
        </section>

        {/* Section 2 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            2. In-Store Purchases Only
          </h2>
          <p>
            All product purchases are conducted in-store at our physical retail locations. This
            website is for informational and promotional purposes only. Product availability, prices,
            and promotions shown on this website may differ from what is available in-store and are
            subject to change without notice.
          </p>
        </section>

        {/* Section 3 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            3. Product Disclaimer
          </h2>
          <p>
            Products sold at {brand.name} are intended for legal use by adults 21 and older only. We
            make no claims regarding the health benefits or safety of any products we carry. Users
            assume all risk associated with the use of products purchased from our stores. Product
            images and descriptions on this website are for illustrative purposes and may not
            reflect exact packaging or formulations currently available in-store.
          </p>
        </section>

        {/* Section 4 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            4. Intellectual Property
          </h2>
          <p>
            All content on this website &mdash; including text, graphics, logos, images, and
            software &mdash; is the property of Deccan Chargers LLC or its licensors and is
            protected by applicable intellectual property laws. You may not reproduce, distribute,
            or create derivative works from any content without our prior written consent.
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            5. Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by law, Deccan Chargers LLC, its officers, directors,
            employees, and affiliates shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising out of or related to your use of this website
            or products purchased in-store. Our total liability for any claim shall not exceed the
            amount you paid for the product giving rise to the claim.
          </p>
        </section>

        {/* Section 6 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            6. Indemnification
          </h2>
          <p>
            You agree to indemnify and hold harmless Deccan Chargers LLC from any claims, damages,
            losses, or expenses (including reasonable attorney fees) arising from your use of this
            website or violation of these Terms.
          </p>
        </section>

        {/* Section 7 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            7. Governing Law
          </h2>
          <p>
            These Terms of Use shall be governed by and construed in accordance with the laws of the
            State of <strong>Texas</strong>, without regard to its conflict of law provisions. Any
            disputes arising under these Terms shall be resolved in the courts located in Travis
            County, Texas.
          </p>
        </section>

        {/* Section 8 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            8. Changes to These Terms
          </h2>
          <p>
            We reserve the right to update these Terms of Use at any time. Changes will be posted on
            this page with an updated &quot;Last updated&quot; date. Your continued use of the
            website after changes are posted constitutes your acceptance of the revised Terms.
          </p>
        </section>

        {/* Section 9 */}
        <section>
          <h2
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            9. Contact
          </h2>
          <p>For questions about these Terms, please contact us at:</p>
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
