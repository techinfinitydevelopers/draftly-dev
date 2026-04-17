import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Legal',
  description: 'Privacy Policy, Cookie Policy, Terms of Service, and compliance information for Draftly.',
};

const links = [
  {
    href: '/legal/privacy',
    title: 'Privacy Policy',
    desc: 'How we collect, use, and protect personal data — including GDPR and US privacy rights.',
  },
  {
    href: '/legal/cookies',
    title: 'Cookie Policy',
    desc: 'Cookies and similar technologies, analytics, marketing pixels, and your choices.',
  },
  {
    href: '/legal/terms',
    title: 'Terms of Service',
    desc: 'Rules for using Draftly, subscriptions, acceptable use, and limitations of liability.',
  },
  {
    href: '/legal/compliance',
    title: 'Compliance overview',
    desc: 'High-level summary of regulatory frameworks we address and how to exercise rights.',
  },
] as const;

export default function LegalHubPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <div className="border-b border-white/[0.06] bg-[#050508]/95 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white/80 hover:text-white transition-colors w-fit"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.08] border border-white/[0.1]">
              <div className="w-2 h-2 rounded-sm bg-white" />
            </div>
            <span className="font-display font-extrabold text-[15px] tracking-tight uppercase">Draftly</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14 md:py-20 pb-24">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          Legal & compliance
        </h1>
        <p className="text-[15px] text-white/55 leading-relaxed max-w-xl mb-12">
          Draftly is built for teams that need clear, professional documentation. These policies describe how we
          handle personal data, cookies, and your use of the service. They are designed to align with common EU/UK
          and US privacy expectations; they are not legal advice — consult counsel for your situation.
        </p>

        <ul className="grid gap-4 sm:grid-cols-2">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all hover:border-teal-400/30 hover:bg-white/[0.05]"
              >
                <h2 className="font-display text-[17px] font-semibold text-white group-hover:text-teal-100/95 mb-2">
                  {item.title}
                  <span className="inline-block ml-1 text-teal-400/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </h2>
                <p className="text-[13px] text-white/50 leading-relaxed">{item.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
