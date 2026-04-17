'use client';

import Link from 'next/link';
import { Linkedin, Instagram, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="contact" className="relative z-10 border-t border-white/[0.06] bg-[#050508]/80 backdrop-blur-xl">
      <div className="max-w-[1200px] mx-auto px-6 py-16 text-white">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.08] border border-white/[0.1]">
                <div className="w-2 h-2 rounded-sm bg-white" />
              </div>
              <span className="font-display font-extrabold text-[17px] tracking-tight uppercase text-white/80">
                Draftly
              </span>
            </Link>
            <p className="text-white/80 text-[13px] leading-relaxed max-w-[280px] mb-5">
              3D Website Builder for cinematic scroll experiences — generated from a single prompt.
            </p>
            {/* Social icons (Lucide icons to avoid CDN issues) */}
            <div className="flex items-center gap-3 mt-1">
              <a href="https://www.linkedin.com/in/piyush-singh-023507359" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/[0.12] border border-white/[0.2] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all">
                <Linkedin className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">LinkedIn</span>
              </a>
              <a href="https://www.instagram.com/piyush.glitch" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/[0.12] border border-white/[0.2] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all">
                <Instagram className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="https://x.com/Piyush_Sxt" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/[0.12] border border-white/[0.2] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all">
                <Twitter className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">X (Twitter)</span>
              </a>
              <a href="mailto:piyush.glitch@draftly.business"
                className="w-9 h-9 rounded-lg bg-white/[0.12] border border-white/[0.2] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Email</span>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-[12px] uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><Link href="/3d-builder" className="text-white/80 hover:text-white text-[13px] transition-colors">3D Builder</Link></li>
              <li><Link href="/pricing" className="text-white/80 hover:text-white text-[13px] transition-colors">Pricing</Link></li>
              <li><Link href="/3d-builder" className="text-white/80 hover:text-white text-[13px] transition-colors">Live Builder</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold text-[12px] uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-white/80 hover:text-white text-[13px] transition-colors">About</Link></li>
              <li><Link href="/docs/getting-started" className="text-white/80 hover:text-white text-[13px] transition-colors">How it Works</Link></li>
              <li><Link href="/docs/getting-started" className="text-white/80 hover:text-white text-[13px] transition-colors">Features</Link></li>
              <li><Link href="/changelog" className="text-white/80 hover:text-white text-[13px] transition-colors">Changelog</Link></li>
              <li><Link href="/contact" className="text-white/80 hover:text-white text-[13px] transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-white font-semibold text-[12px] uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link href="/legal/privacy" className="text-white/80 hover:text-white text-[13px] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/legal/cookies" className="text-white/80 hover:text-white text-[13px] transition-colors">Cookie Policy</Link></li>
              <li><Link href="/legal/terms" className="text-white/80 hover:text-white text-[13px] transition-colors">Terms of Service</Link></li>
              <li><Link href="/legal/compliance" className="text-white/80 hover:text-white text-[13px] transition-colors">Compliance</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="h-px bg-white/[0.06] mt-12 mb-6" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/80 text-[13px] md:text-[14px] font-mono">
          <span className="text-center md:text-left flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-1">
            <span>&copy; {new Date().getFullYear()} Draftly. All rights reserved.</span>
            <span className="hidden sm:inline text-white/35" aria-hidden>
              |
            </span>
            <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-white/55">
              <Link href="/legal/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/legal/cookies" className="hover:text-white transition-colors">
                Cookies
              </Link>
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="uppercase tracking-[0.18em] text-[11px] md:text-[12px] text-white/60">
              Built in India
            </span>
            <svg aria-label="Indian flag" viewBox="0 0 900 600" className="w-7 h-5 md:w-9 md:h-6 rounded-[3px] shadow-sm flex-shrink-0">
              <rect width="900" height="200" fill="#FF9933" />
              <rect y="200" width="900" height="200" fill="#FFFFFF" />
              <rect y="400" width="900" height="200" fill="#138808" />
              <circle cx="450" cy="300" r="60" fill="none" stroke="#000080" strokeWidth="4" />
              {[...Array(24)].map((_, i) => (
                <line
                  key={i}
                  x1="450"
                  y1="300"
                  x2={450 + 55 * Math.cos((i * 15 * Math.PI) / 180)}
                  y2={300 + 55 * Math.sin((i * 15 * Math.PI) / 180)}
                  stroke="#000080"
                  strokeWidth="2"
                />
              ))}
              <circle cx="450" cy="300" r="12" fill="#000080" />
            </svg>
          </span>
          <a
            href="mailto:piyush.glitch@draftly.business"
            className="hover:text-white transition-colors text-center md:text-right break-all"
          >
            piyush.glitch@draftly.business
          </a>
        </div>
      </div>
    </footer>
  );
}
