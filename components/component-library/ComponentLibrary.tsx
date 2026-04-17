'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ComponentTemplate {
  id: string;
  name: string;
  category: 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'footer';
  description: string;
  preview: string; // SVG or icon
  conversionRate: string;
  bestFor: string[];
  prompt: string;
}

const componentTemplates: ComponentTemplate[] = [
  // Hero variations
  {
    id: 'hero-split',
    name: 'Split Hero',
    category: 'hero',
    description: 'Text left, visual right. Classic high-converting layout.',
    preview: 'split',
    conversionRate: '8-12%',
    bestFor: ['SaaS', 'Apps', 'Products'],
    prompt: 'Create a split hero section with compelling headline on the left, subheadline, CTA buttons, and product screenshot/visual on the right. Clean, modern, lots of whitespace.'
  },
  {
    id: 'hero-center',
    name: 'Centered Hero',
    category: 'hero',
    description: 'Bold centered headline with supporting elements.',
    preview: 'center',
    conversionRate: '6-10%',
    bestFor: ['Brands', 'Services', 'Agencies'],
    prompt: 'Create a centered hero with large bold headline, supporting text, and single focused CTA. Minimal, elegant, strong typography.'
  },
  {
    id: 'hero-video',
    name: 'Video Background',
    category: 'hero',
    description: 'Cinematic video with overlay text. High engagement.',
    preview: 'video',
    conversionRate: '10-15%',
    bestFor: ['Creative', 'Events', 'Startups'],
    prompt: 'Create a hero with video background (auto-play, muted, loop), dark overlay for text readability, and centered compelling message with CTA.'
  },
  {
    id: 'hero-minimal',
    name: 'Minimal Text',
    category: 'hero',
    description: 'Ultra-clean with typography focus. Premium feel.',
    preview: 'minimal',
    conversionRate: '5-8%',
    bestFor: ['Luxury', 'Fashion', 'Design'],
    prompt: 'Create an ultra-minimal hero with large elegant typography, minimal elements, lots of whitespace, and subtle animations. Premium aesthetic.'
  },

  // Features variations
  {
    id: 'features-grid',
    name: 'Grid Cards',
    category: 'features',
    description: '3x2 grid of feature cards with icons.',
    preview: 'grid',
    conversionRate: '4-6%',
    bestFor: ['Products', 'Services', 'SaaS'],
    prompt: 'Create a features section with 6 cards in a 3x2 grid. Each card has icon, title, description. Clean cards with subtle shadows and hover effects.'
  },
  {
    id: 'features-split',
    name: 'Alternating Split',
    category: 'features',
    description: 'Image left, text right (alternating). Easy to scan.',
    preview: 'alternate',
    conversionRate: '5-8%',
    bestFor: ['Products', 'Apps', 'Tools'],
    prompt: 'Create features section with 3 rows. Each row alternates: image left/text right, then text left/image right. Visual and scannable.'
  },

  // Pricing variations
  {
    id: 'pricing-three',
    name: '3-Tier Cards',
    category: 'pricing',
    description: 'Standard three plans with middle highlighted.',
    preview: '3tier',
    conversionRate: '12-18%',
    bestFor: ['SaaS', 'Subscriptions', 'Services'],
    prompt: 'Create 3-tier pricing section. Starter ($29), Pro ($79 highlighted as recommended), Enterprise ($199). Feature lists, toggle monthly/yearly, clear CTAs.'
  },
  {
    id: 'pricing-toggle',
    name: 'Toggle Pricing',
    category: 'pricing',
    description: 'Monthly/yearly toggle with savings highlight.',
    preview: 'toggle',
    conversionRate: '15-22%',
    bestFor: ['SaaS', 'Subscriptions'],
    prompt: 'Create pricing with prominent monthly/yearly toggle. Show "Save 20%" badge on yearly. 3 plans with middle plan emphasized. Clean comparison.'
  },
  {
    id: 'pricing-simple',
    name: 'Single Price',
    category: 'pricing',
    description: 'One clear price point. No confusion.',
    preview: 'simple',
    conversionRate: '8-12%',
    bestFor: ['Products', 'Courses', 'Books'],
    prompt: 'Create simple single-price section. One clear price, value proposition, what\'s included list, and strong CTA. No decision fatigue.'
  },

  // Testimonials variations
  {
    id: 'testimonials-grid',
    name: 'Grid Quotes',
    category: 'testimonials',
    description: '3-4 customer quotes in a clean grid.',
    preview: 'quotes',
    conversionRate: '6-10%',
    bestFor: ['All types'],
    prompt: 'Create testimonials section with 3 quotes in a row. Each has quote text, 5-star rating, customer photo (placeholder), name, and title. Clean cards.'
  },
  {
    id: 'testimonials-carousel',
    name: 'Carousel',
    category: 'testimonials',
    description: 'Sliding testimonials with navigation.',
    preview: 'carousel',
    conversionRate: '5-8%',
    bestFor: ['Services', 'Agencies'],
    prompt: 'Create testimonial carousel with 5+ quotes. Auto-advancing with manual navigation dots. Large quote text, customer info, company logos.'
  },
  {
    id: 'testimonials-video',
    name: 'Video Reviews',
    category: 'testimonials',
    description: 'Video testimonial thumbnails with play buttons.',
    preview: 'video-review',
    conversionRate: '10-15%',
    bestFor: ['Products', 'Courses', 'Coaching'],
    prompt: 'Create video testimonial grid with 4 thumbnails. Each has play button overlay, customer name, and brief quote. Click to play modal.'
  },
  {
    id: 'testimonials-logos',
    name: 'Logo Wall',
    category: 'testimonials',
    description: 'Trusted by section with company logos.',
    preview: 'logos',
    conversionRate: '3-5%',
    bestFor: ['B2B', 'Enterprise', 'Startups'],
    prompt: 'Create "Trusted by" section with 6-8 company logos in a grid. Subtle grayscale with color on hover. Brief headline above.'
  },

  // CTA variations
  {
    id: 'cta-banner',
    name: 'Banner CTA',
    category: 'cta',
    description: 'Full-width banner with gradient. Eye-catching.',
    preview: 'banner',
    conversionRate: '8-12%',
    bestFor: ['All types'],
    prompt: 'Create full-width CTA banner with gradient background. Bold headline, supporting text, and large button. High contrast, impossible to miss.'
  },
  {
    id: 'cta-sticky',
    name: 'Sticky Bottom',
    category: 'cta',
    description: 'Fixed bottom bar. Always visible.',
    preview: 'sticky',
    conversionRate: '10-15%',
    bestFor: ['Long pages', 'Sales pages'],
    prompt: 'Create sticky bottom CTA bar that stays visible while scrolling. Compact: headline + CTA button + close option. Mobile-friendly.'
  },

  // Footer variations
  {
    id: 'footer-full',
    name: 'Full Footer',
    category: 'footer',
    description: 'Multi-column with links, social, newsletter.',
    preview: 'full',
    conversionRate: 'N/A',
    bestFor: ['All types'],
    prompt: 'Create comprehensive footer with 4 columns: company info, product links, resources, legal. Social icons, newsletter signup, copyright.'
  },
  {
    id: 'footer-simple',
    name: 'Minimal Footer',
    category: 'footer',
    description: 'Logo, copyright, essential links only.',
    preview: 'minimal-footer',
    conversionRate: 'N/A',
    bestFor: ['Landing pages', 'Minimal sites'],
    prompt: 'Create minimal footer with just logo, copyright line, and 2-3 essential links. Clean, doesn\'t distract from main content.'
  },
];

interface ComponentLibraryProps {
  onSelectComponent: (template: ComponentTemplate) => void;
  currentCategory?: string;
}

export function ComponentLibrary({ onSelectComponent, currentCategory }: ComponentLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory || 'hero');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'hero', label: 'Hero', icon: 'star' },
    { id: 'features', label: 'Features', icon: 'list-check' },
    { id: 'pricing', label: 'Pricing', icon: 'tags' },
    { id: 'testimonials', label: 'Social', icon: 'quote-left' },
    { id: 'cta', label: 'CTA', icon: 'bullhorn' },
    { id: 'footer', label: 'Footer', icon: 'window-minimize' },
  ];

  const filteredComponents = componentTemplates.filter(
    (c) =>
      c.category === selectedCategory &&
      (searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="relative">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-[12px] text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/[0.06] overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <i className={`fa-solid fa-${cat.icon}`} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Components Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-2">
          <AnimatePresence mode="popLayout">
            {filteredComponents.map((template, index) => (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectComponent(template)}
                className="text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[13px] font-bold text-white group-hover:text-violet-300 transition-colors">
                    {template.name}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {template.conversionRate}
                  </span>
                </div>
                
                <p className="text-[11px] text-white/60 mb-2 line-clamp-2">
                  {template.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {template.bestFor.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Hover hint */}
                <div className="mt-2 pt-2 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-violet-400">
                    <i className="fa-solid fa-plus mr-1" />
                    Click to add to site
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-box-open text-3xl text-white/20 mb-2" />
            <p className="text-[12px] text-white/50">No components found</p>
          </div>
        )}
      </div>
    </div>
  );
}
