import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocShell } from '@/components/legal/LegalDocShell';
import { LEGAL_LAST_UPDATED, PRIVACY_CONTACT_EMAIL } from '@/lib/legal-meta';

export const metadata: Metadata = {
  title: 'Compliance overview',
  description:
    'High-level overview of how Draftly approaches GDPR, UK GDPR, US state privacy laws, and security expectations.',
};

export default function ComplianceOverviewPage() {
  return (
    <LegalDocShell title="Compliance overview" lastUpdated={LEGAL_LAST_UPDATED}>
      <section>
        <h2>Purpose</h2>
        <p>
          This page summarizes how Draftly approaches common regulatory and customer expectations. It is{' '}
          <strong>not</strong> a certification, legal opinion, or exhaustive list of obligations. Customers and partners
          should perform their own diligence and consult qualified counsel.
        </p>
      </section>

      <section>
        <h2>Documents</h2>
        <p>Our primary legal documents are:</p>
        <ul>
          <li>
            <Link href="/legal/privacy">Privacy Policy</Link> — personal data processing, international transfers, and
            individual rights.
          </li>
          <li>
            <Link href="/legal/cookies">Cookie Policy</Link> — cookies, analytics, and advertising technologies.
          </li>
          <li>
            <Link href="/legal/terms">Terms of Service</Link> — acceptable use, subscriptions, liability, and
            governing law.
          </li>
        </ul>
      </section>

      <section>
        <h2>European Union, EEA, UK &amp; Switzerland</h2>
        <p>
          Where the GDPR, UK GDPR, or Swiss FADP applies, we aim to process personal data lawfully, fairly, and
          transparently; limit collection to what is needed; honor data subject rights; and use appropriate safeguards
          for international transfers (such as Standard Contractual Clauses where required).
        </p>
        <p>
          Legal bases we rely on commonly include contract (providing the Service), legitimate interests (security and
          product improvement, balanced against your rights), and consent where required — especially for
          non-essential cookies or marketing.
        </p>
      </section>

      <section>
        <h2>United States — state privacy laws</h2>
        <p>
          Several US states (including California, Colorado, Connecticut, Virginia, and others) grant residents rights
          regarding personal information and impose rules on “sales,” “sharing,” and targeted advertising. Our Privacy
          Policy describes how to submit requests. We honor applicable opt-out rights, including recognition of Global
          Privacy Control where required for browser-based opt-outs.
        </p>
        <p>
          We do not “sell” personal information for money in the conventional sense. Some cookies or pixels used for
          advertising or analytics may constitute “sharing” or targeted advertising under state definitions; those are
          addressed in our Cookie Policy.
        </p>
      </section>

      <section>
        <h2>Security &amp; subprocessors</h2>
        <p>
          We implement administrative, technical, and organizational measures designed to protect personal data
          appropriate to the risk, including secure transport, access controls, and vendor review. We use reputable
          infrastructure and service providers to host and operate the Service.
        </p>
        <p>
          Enterprise customers who need a Data Processing Agreement (DPA) or subprocessor list for their records should
          contact us. Availability may depend on your plan and executed agreement.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          The Service is not directed to children under 16. We do not knowingly collect personal information from
          children as described in our Privacy Policy.
        </p>
      </section>

      <section>
        <h2>AI &amp; automated processing</h2>
        <p>
          Features may use machine learning and third-party model APIs. We process prompts and related data to deliver
          the Service as described in the Privacy Policy. Outputs are generated for your creative use; you are
          responsible for compliance with laws applicable to your content and use cases.
        </p>
      </section>

      <section>
        <h2>Contact &amp; data protection inquiries</h2>
        <p>
          For privacy requests, questions about this overview, or security issues:{' '}
          <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
        </p>
        <p className="text-[13px] text-white/50">
          If you are a supervisory authority or law enforcement agency, please use the same channel and include
          sufficient detail for us to validate and respond promptly.
        </p>
      </section>
    </LegalDocShell>
  );
}
