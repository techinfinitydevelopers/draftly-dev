import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocShell } from '@/components/legal/LegalDocShell';
import { LEGAL_LAST_UPDATED, LEGAL_ENTITY, PRIVACY_CONTACT_EMAIL, getSiteUrl } from '@/lib/legal-meta';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Draftly Privacy Policy: how we process personal data, your rights under GDPR and US state laws, and how to contact us.',
};

export default function PrivacyPolicyPage() {
  const site = getSiteUrl();

  return (
    <LegalDocShell title="Privacy Policy" lastUpdated={LEGAL_LAST_UPDATED}>
      <section>
        <h2>1. Introduction</h2>
        <p>
          {LEGAL_ENTITY} (“<strong>we</strong>,” “<strong>us</strong>,” or “<strong>our</strong>”) operates the
          website and services available at <Link href={site}>{site}</Link> (the “<strong>Service</strong>”). This
          Privacy Policy explains how we collect, use, disclose, and safeguard personal data when you use the Service,
          create an account, purchase a subscription, or otherwise interact with us.
        </p>
        <p>
          We act as a <strong>data controller</strong> for personal data we determine the purposes and means of
          processing. Where we process data strictly on behalf of a customer (for example, as a processor under a
          written agreement), that relationship is governed by our terms and any data processing addendum.
        </p>
        <p>
          By using the Service, you acknowledge that you have read this policy. If you do not agree, please do not use
          the Service.
        </p>
      </section>

      <section>
        <h2>2. Scope &amp; children</h2>
        <p>
          The Service is not directed to children under 16 (or the age required by your jurisdiction). We do not
          knowingly collect personal data from children. If you believe we have collected such data, contact us and we
          will delete it promptly.
        </p>
      </section>

      <section>
        <h2>3. Data we collect</h2>
        <p>Depending on how you use the Service, we may collect:</p>
        <ul>
          <li>
            <strong>Account &amp; identity:</strong> name, email address, authentication identifiers (for example,
            Google sign-in subject ID), profile image URL if provided by your identity provider, and account
            preferences.
          </li>
          <li>
            <strong>Billing &amp; transactions:</strong> subscription status, plan, payment-related records, and
            transaction references. Payment card data is typically handled by our payment processor; we do not store
            full card numbers on our servers.
          </li>
          <li>
            <strong>Usage &amp; technical data:</strong> IP address, device/browser type, approximate location derived
            from IP, pages viewed, referring URLs, timestamps, and diagnostic logs needed to operate and secure the
            Service.
          </li>
          <li>
            <strong>Content you provide:</strong> prompts, uploads, generated outputs, project metadata, and support
            messages you send us.
          </li>
          <li>
            <strong>Communications:</strong> email correspondence and metadata (for example, delivery status) when
            you contact us.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. How we use data (purposes &amp; legal bases)</h2>
        <p>We use personal data for the following purposes, as permitted by applicable law:</p>
        <ul>
          <li>
            <strong>Provide and improve the Service</strong> — account creation, authentication, generation features,
            hosting of your content as described in our Terms, troubleshooting, and product analytics.{' '}
            <em>Legal bases (where GDPR applies):</em> performance of a contract; legitimate interests in operating
            and improving a secure SaaS product.
          </li>
          <li>
            <strong>Billing and fraud prevention</strong> — processing payments, detecting abuse, and enforcing our
            Terms. <em>Legal bases:</em> performance of a contract; legitimate interests; legal obligations where
            applicable.
          </li>
          <li>
            <strong>Security &amp; compliance</strong> — monitoring for attacks, fraud, and violations; audit logs;
            responding to lawful requests. <em>Legal bases:</em> legitimate interests; legal obligation.
          </li>
          <li>
            <strong>Communications</strong> — service-related notices, security alerts, and (where permitted) product
            updates. Marketing emails, if any, are sent in line with your preferences and applicable law.{' '}
            <em>Legal bases:</em> legitimate interests; consent where required.
          </li>
          <li>
            <strong>Analytics &amp; measurement</strong> — understanding how the Service is used to improve UX and
            performance. Where required, we rely on consent or legitimate interests as described in our{' '}
            <Link href="/legal/cookies">Cookie Policy</Link>.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Cookies &amp; similar technologies</h2>
        <p>
          We use cookies, local storage, and similar technologies for authentication, preferences, security, and
          analytics. Details, including third-party tools such as analytics or advertising pixels, are described in
          our <Link href="/legal/cookies">Cookie Policy</Link>.
        </p>
      </section>

      <section>
        <h2>6. Sharing &amp; subprocessors</h2>
        <p>We may share personal data with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> who assist with hosting, databases, email, analytics, payments,
            customer support, security, and AI/model infrastructure — only as needed to perform their functions and
            subject to appropriate contractual safeguards.
          </li>
          <li>
            <strong>Professional advisors</strong> (lawyers, accountants) where required.
          </li>
          <li>
            <strong>Authorities</strong> when we believe disclosure is required by law, regulation, legal process, or
            to protect rights, safety, and security.
          </li>
          <li>
            <strong>Business transfers</strong> in connection with a merger, acquisition, or sale of assets, with
            notice as required by law.
          </li>
        </ul>
        <p>
          A current list of categories of recipients may be provided on request. We do not sell personal data for money
          in the traditional sense; where US state laws define “sale” or “sharing” broadly (for example, certain
          advertising cookies), we describe choices in our Cookie Policy and honor applicable opt-out signals where
          required.
        </p>
      </section>

      <section>
        <h2>7. International transfers</h2>
        <p>
          We may process and store data in the United States, India, the European Economic Area, the United Kingdom, and
          other countries where we or our providers operate. When we transfer personal data from the EEA, UK, or
          Switzerland to countries not deemed adequate, we use appropriate safeguards such as Standard Contractual
          Clauses (SCCs) or equivalent mechanisms, plus supplementary measures where appropriate.
        </p>
      </section>

      <section>
        <h2>8. Retention</h2>
        <p>
          We retain personal data only as long as necessary for the purposes above, including legal, accounting, and
          reporting requirements. Retention periods vary: for example, account data is kept while your account is active
          and for a reasonable period afterward; security logs may be kept for a shorter or longer period depending on
          operational need. Aggregated or de-identified information may be retained without limitation where permitted.
        </p>
      </section>

      <section>
        <h2>9. Security</h2>
        <p>
          We implement technical and organizational measures appropriate to the risk, including encryption in transit,
          access controls, and vendor review. No method of transmission or storage is 100% secure; we cannot guarantee
          absolute security.
        </p>
      </section>

      <section>
        <h2>10. Your rights (EEA, UK, Switzerland)</h2>
        <p>If the GDPR or UK GDPR applies, you may have the right to:</p>
        <ul>
          <li>Access, rectify, or erase your personal data;</li>
          <li>Restrict or object to certain processing;</li>
          <li>Data portability;</li>
          <li>Withdraw consent where processing is consent-based;</li>
          <li>Lodge a complaint with a supervisory authority.</li>
        </ul>
        <p>
          To exercise these rights, contact us at{' '}
          <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>. We may need to verify your identity
          before fulfilling requests.
        </p>
      </section>

      <section>
        <h2>11. Your rights (United States)</h2>
        <p>
          Depending on your state of residence (for example California, Colorado, Virginia, and others with
          comprehensive privacy laws), you may have rights to know, access, correct, delete, or obtain a copy of
          personal information, and to opt out of certain processing such as “sale,” “sharing,” or targeted
          advertising, as those terms are defined locally. You may also have the right to appeal our decisions. We do
          not discriminate for exercising privacy rights.
        </p>
        <p>
          Submit requests by emailing{' '}
          <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a> with “Privacy Request” in the subject
          line. Authorized agents may submit requests where permitted by law; we may require proof of authorization.
        </p>
      </section>

      <section>
        <h2>12. Automated decision-making</h2>
        <p>
          The Service uses automated systems (including AI) to generate content from your inputs. We do not use those
          systems to make solely automated decisions with legal or similarly significant effects about you without
          human oversight where such a prohibition applies.
        </p>
      </section>

      <section>
        <h2>13. Third-party links &amp; integrations</h2>
        <p>
          The Service may link to third-party sites or allow you to connect integrations (for example payment,
          analytics, or deployment providers). Those services have their own policies; we are not responsible for their
          practices.
        </p>
      </section>

      <section>
        <h2>14. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the revised version on this page and
          update the “Last updated” date. For material changes, we may provide additional notice (for example, by
          email or in-product notice) where required.
        </p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p>
          Questions about this policy or our data practices:{' '}
          <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
        </p>
        <p className="text-white/55 text-[13px]">
          Data controller: {LEGAL_ENTITY}. Primary contact for privacy inquiries: {PRIVACY_CONTACT_EMAIL}.
        </p>
      </section>
    </LegalDocShell>
  );
}
