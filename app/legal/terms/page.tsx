import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocShell } from '@/components/legal/LegalDocShell';
import { LEGAL_LAST_UPDATED, LEGAL_ENTITY, PRIVACY_CONTACT_EMAIL, getSiteUrl } from '@/lib/legal-meta';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Draftly: acceptable use, subscriptions, intellectual property, and limitations.',
};

export default function TermsOfServicePage() {
  const site = getSiteUrl();

  return (
    <LegalDocShell title="Terms of Service" lastUpdated={LEGAL_LAST_UPDATED}>
      <section>
        <h2>1. Agreement</h2>
        <p>
          These Terms of Service (“<strong>Terms</strong>”) govern your access to and use of websites, applications,
          and services operated by {LEGAL_ENTITY} at <Link href={site}>{site}</Link> (collectively, the “
          <strong>Service</strong>”). By accessing or using the Service, you agree to these Terms. If you use the
          Service on behalf of an organization, you represent that you have authority to bind that organization.
        </p>
        <p>
          Our <Link href="/legal/privacy">Privacy Policy</Link> explains how we handle personal data. The Privacy
          Policy is incorporated by reference.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least the age of digital consent in your jurisdiction (and in any case not under 16) to use the
          Service. If you are prohibited from receiving services under applicable law, you may not use the Service.
        </p>
      </section>

      <section>
        <h2>3. Accounts &amp; security</h2>
        <p>
          You are responsible for maintaining the confidentiality of your credentials and for activity under your
          account. Notify us promptly at <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a> if you
          suspect unauthorized access.
        </p>
      </section>

      <section>
        <h2>4. Plans, billing &amp; taxes</h2>
        <p>
          Paid features are offered on a subscription or usage basis as described at checkout and on our pricing pages.
          Fees are billed in advance unless stated otherwise. You authorize us and our payment processors to charge
          your payment method for applicable fees, taxes, and renewals.
        </p>
        <p>
          <strong>Renewals.</strong> Subscriptions renew automatically for the same term until you cancel in
          accordance with the cancellation method we provide. <strong>Cancellation.</strong> You may cancel before the
          next renewal date to avoid future charges; cancellation does not refund the current period except where
          required by law or expressly stated at purchase.
        </p>
        <p>
          <strong>Taxes.</strong> Fees exclude applicable taxes unless indicated; you are responsible for any sales,
          use, VAT, GST, or similar taxes.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Violate any law or third-party rights;</li>
          <li>
            Upload or generate unlawful, infringing, defamatory, harassing, hateful, or sexually exploitative
            content;
          </li>
          <li>Attempt to probe, scan, or test the vulnerability of the Service or bypass security;</li>
          <li>
            Reverse engineer, decompile, or attempt to extract source code or models except where permitted by law;
          </li>
          <li>Use the Service to build competing scrapers, training datasets, or services that materially impair us;</li>
          <li>Resell or redistribute the Service without our written agreement;</li>
          <li>Interfere with other users’ use of the Service or impose unreasonable load.</li>
        </ul>
        <p>
          We may investigate violations and cooperate with law enforcement. We may suspend or terminate access for
          violations.
        </p>
      </section>

      <section>
        <h2>6. Your content &amp; license to us</h2>
        <p>
          You retain rights to content you submit (“<strong>Your Content</strong>”). To operate the Service, you grant
          {LEGAL_ENTITY} a worldwide, non-exclusive, royalty-free license to host, reproduce, process, transmit, display,
          and create derivative works (for example, resized images, generated previews) solely to provide, secure, and
          improve the Service for you.
        </p>
        <p>
          You represent that you have all rights necessary to grant this license. Do not submit confidential or
          personal data you are not allowed to share.
        </p>
      </section>

      <section>
        <h2>7. AI outputs &amp; disclaimer</h2>
        <p>
          The Service may use artificial intelligence. Outputs may be inaccurate, incomplete, or inappropriate. You
          are responsible for reviewing outputs before use, especially for legal, medical, financial, or safety-critical
          decisions. The Service is provided for creative and productivity purposes and does not constitute professional
          advice.
        </p>
      </section>

      <section>
        <h2>8. Our intellectual property</h2>
        <p>
          The Service, including software, branding, and documentation, is owned by {LEGAL_ENTITY} or its licensors.
          Except for the limited rights expressly granted in these Terms, we reserve all rights.
        </p>
      </section>

      <section>
        <h2>9. Third-party services</h2>
        <p>
          The Service may integrate with third-party services (hosting, payments, analytics, etc.). Your use of those
          services may be subject to third-party terms. We are not responsible for third-party services.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
          WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
          OR FREE OF HARMFUL COMPONENTS.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER {LEGAL_ENTITY.toUpperCase()} NOR ITS SUPPLIERS WILL BE LIABLE
          FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO THESE TERMS OR THE
          SERVICE, EVEN IF ADVISED OF THE POSSIBILITY.
        </p>
        <p>
          OUR AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE OR THESE TERMS WILL NOT
          EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE EVENT
          GIVING RISE TO LIABILITY, OR (B) ONE HUNDRED U.S. DOLLARS (US $100), EXCEPT WHERE PROHIBITED BY LAW.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the maximum
          permitted by law.
        </p>
      </section>

      <section>
        <h2>12. Indemnity</h2>
        <p>
          You will defend, indemnify, and hold harmless {LEGAL_ENTITY} and its affiliates, officers, and employees from
          any claims, damages, losses, and expenses (including reasonable attorneys’ fees) arising from Your Content,
          your use of the Service, or your violation of these Terms, except to the extent caused by our willful
          misconduct.
        </p>
      </section>

      <section>
        <h2>13. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you breach these Terms, if
          required by law, or if we discontinue the Service with reasonable notice where practicable. Provisions that by
          their nature should survive (including intellectual property, disclaimers, limitations, indemnity, and
          dispute provisions) will survive termination.
        </p>
      </section>

      <section>
        <h2>14. Governing law &amp; disputes</h2>
        <p>
          These Terms are governed by the laws of India, excluding conflict-of-law rules, unless mandatory consumer
          protections in your country require otherwise. Courts in India shall have exclusive jurisdiction, subject to
          any non-waivable rights you may have to bring claims in your home jurisdiction under consumer protection laws.
        </p>
        <p>
          If you are located in the EEA, UK, or Switzerland, you may also have the right to bring a claim in your
          country of residence, and nothing in these Terms limits non-waivable statutory rights.
        </p>
      </section>

      <section>
        <h2>15. Export &amp; sanctions</h2>
        <p>
          You may not use the Service in violation of export control or sanctions laws. You represent that you are not
          located in a prohibited jurisdiction or listed on any restricted party list.
        </p>
      </section>

      <section>
        <h2>16. Changes</h2>
        <p>
          We may modify these Terms by posting an updated version and changing the “Last updated” date. For material
          changes to paid customers, we will provide reasonable advance notice where required. Continued use after the
          effective date constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2>17. Contact</h2>
        <p>
          Questions about these Terms:{' '}
          <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalDocShell>
  );
}
