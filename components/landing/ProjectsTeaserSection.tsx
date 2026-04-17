'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ProjectsTeaserSection() {
  return (
    <section id="projects" className="py-24 px-6 scroll-mt-20 flex items-center min-h-[60vh]">
      <div className="max-w-[1000px] mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-white/40 mb-6">
            <i className="fa-solid fa-grid-2 text-[10px]" />
            PROJECTS
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tighter-custom mb-4">
            Your Projects, One Place
          </h2>
          <p className="text-white/30 text-lg max-w-xl mx-auto mb-10">
            Create full-stack apps, iterate with AI chat, and export to code or publish as mobile apps.
          </p>
          <Link
            href="/dashboard"
            className="btn-primary-glow inline-flex items-center gap-2 text-white px-8 py-4 rounded-xl"
          >
            <i className="fa-solid fa-grid-2 text-sm" />
            Go to Dashboard
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
