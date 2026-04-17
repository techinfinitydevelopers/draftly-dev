import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocShell } from '@/components/legal/LegalDocShell';
import { LEGAL_LAST_UPDATED, PRIVACY_CONTACT_EMAIL, getSiteUrl } from '@/lib/legal-meta';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'How Draftly uses cookies and similar technologies, including analytics and marketing tools, and how to manage preferences.',
};

export default function CookiePolicyPage() {
  const site = getSiteUrl();

  return (
    <LegalDocShell title="Cookie Policy" lastUpdated={LEGAL_LAST_UPDATED}>
      <section>
        <h2>1. What this policy covers</h2>
        <p>
          This Cookie Policy explains how {site.replace(/^https?:\/\//, '')} (the “<strong>Site</strong>”) and our
          related web applications (“<strong>Service</strong>”) use cookies, pixels, local storage, and similar
          technologies (together, “<strong>cookies</strong>”) when you visit or use the Service. It should be read
          together with our <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>2. What cookies are</h2>
        <p>
          Cookies are small text files stored on your device. They help the Service remember you, keep you signed in,
          understand usage, and (where allowed) measure marketing effectiveness. Similar technologies include pixels
          (invisible images that load when you open a page), scripts, and browser storage APIs.
        </p>
      </section>

      <section>
        <h2>3. How long cookies last</h2>
        <ul>
          <li>
            <strong>Session cookies</strong> expire when you close your browser.
          </li>
          <li>
            <strong>Persistent cookies</strong> remain for a set period or until you delete them.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Categories we use</h2>

        <h3>4.1 Strictly necessary</h3>
        <p>
          Required for core functionality: security, load balancing, authentication sessions, and remembering
          essential preferences (for example, cookie banner choices if we offer them). These cannot typically be
          disabled without breaking the Service.
        </p>

        <h3>4.2 Functional</h3>
        <p>
          Used to remember choices you make (language, UI state, collapsed panels) and to improve your experience.
        </p>

        <h3>4.3 Analytics &amp; performance</h3>
        <p>
          Help us understand traffic, feature usage, and errors. We may use first-party or third-party analytics (for
          example Firebase / Google Analytics–class tools) to collect pseudonymous identifiers, device data, and
          event data. Where required by law, we rely on your consent or legitimate interests as disclosed at the time
          of collection.
        </p>

        <h3>4.4 Marketing &amp; advertising</h3>
        <p>
          We may use pixels or tags from advertising partners (for example Meta/Facebook) to measure conversions,
          build custom audiences, or deliver relevant ads on third-party platforms. These technologies may read or set
          identifiers in your browser. Where required, we will obtain consent before loading non-essential marketing
          cookies or use industry opt-out mechanisms compatible with applicable law.
        </p>
      </section>

      <section>
        <h2>5. Third-party technologies</h2>
        <p>
          Third parties that may set or read cookies when you use the Service include, depending on configuration:
        </p>
        <ul>
          <li>
            <strong>Authentication &amp; infrastructure</strong> — for example Firebase or similar identity/hosting
            providers used to run accounts and the application.
          </li>
          <li>
            <strong>Analytics</strong> — tools that aggregate usage events to help us improve the product.
          </li>
          <li>
            <strong>Advertising / measurement</strong> — for example Meta Pixel for attribution and advertising
            measurement.
          </li>
          <li>
            <strong>Payments</strong> — our payment provider may use cookies or similar technologies on their checkout
            pages.
          </li>
        </ul>
        <p>
          Each provider processes data under its own privacy notice. We recommend reviewing those notices for more
          detail.
        </p>
      </section>

      <section>
        <h2>6. Your choices</h2>
        <p>You can control cookies in several ways:</p>
        <ul>
          <li>
            <strong>Browser settings:</strong> Most browsers let you block or delete cookies. Blocking all cookies may
            affect sign-in and core features.
          </li>
          <li>
            <strong>Industry tools:</strong> Where available, you can use opt-out tools for interest-based advertising
            (for example, aboutads.info or your mobile device’s advertising ID settings).
          </li>
          <li>
            <strong>Global Privacy Control (GPC):</strong> Where required by applicable US state law, we honor
            recognized opt-out signals such as GPC for the relevant processing activities.
          </li>
          <li>
            <strong>Contact us:</strong> Email{' '}
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a> for help with privacy or cookie
            preferences.
          </li>
        </ul>
        <p>
          In the EEA, UK, and Switzerland, non-essential cookies (for example certain analytics or marketing cookies)
          are typically placed only after you accept them through a consent mechanism where required.
        </p>
      </section>

      <section>
        <h2>7. Do Not Track</h2>
        <p>
          There is no consistent industry standard for “Do Not Track” browser signals. We treat legally recognized
          opt-out mechanisms (such as GPC where applicable) in line with applicable law.
        </p>
      </section>

      <section>
        <h2>8. Updates</h2>
        <p>
          We may update this Cookie Policy when we change our practices or add new tools. Check the “Last updated” date
          at the top of this page.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions: <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalDocShell>
  );
}
