'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FormBuilder, FormConfig } from '@/components/form-builder/FormBuilder';

interface BusinessSettingsProps {
  setInput?: (value: string) => void;
  onSendMessage?: (text: string) => void;
}

export function BusinessSettings({ setInput, onSendMessage }: BusinessSettingsProps) {
  const [activeSection, setActiveSection] = useState<'payments' | 'forms' | 'seo' | 'analytics'>('payments');
  const [showPromptPreview, setShowPromptPreview] = useState<string | null>(null);

  const sections = [
    { id: 'payments' as const, label: 'Payments', icon: 'credit-card', desc: 'Add payment integration' },
    { id: 'forms' as const, label: 'Forms', icon: 'wpforms', desc: 'Lead capture forms' },
    { id: 'seo' as const, label: 'SEO', icon: 'magnifying-glass', desc: 'Search optimization' },
    { id: 'analytics' as const, label: 'Analytics', icon: 'chart-pie', desc: 'Visitor tracking' },
  ];

  const handlePaymentPrompt = (provider: string) => {
    const prompts: Record<string, string> = {
      stripe: `Add Stripe payment integration to the website. Include:
- A pricing section with 3 tiers (Basic $29/month, Pro $79/month, Enterprise custom)
- Stripe Checkout integration for subscription payments
- Customer portal link for managing subscriptions
- Clear call-to-action buttons on each pricing tier`,
      paypal: `Add PayPal payment buttons to the website. Include:
- PayPal checkout buttons for one-time purchases
- Support for credit/debit cards through PayPal
- A "Buy Now" section for the main product/service
- Payment confirmation and receipt system`,
      razorpay: `Add Razorpay payment integration for Indian customers. Include:
- UPI, credit/debit card, and net banking support
- INR pricing display
- Automatic GST invoice generation
- Payment success/failure handling`,
    };
    
    const prompt = prompts[provider] || `Add ${provider} payment integration to the website`;
    setInput?.(prompt);
    onSendMessage?.(prompt);
  };

  const handleSEOPrompt = (settings: {
    siteTitle: string;
    description: string;
    keywords: string;
    enableSitemap: boolean;
  }) => {
    const prompt = `Optimize the website for SEO with the following:
${settings.siteTitle ? `- Page title: "${settings.siteTitle}"` : ''}
${settings.description ? `- Meta description: "${settings.description}"` : ''}
${settings.keywords ? `- Target keywords: ${settings.keywords}` : ''}
- Add proper meta tags (Open Graph, Twitter Cards)
- Implement semantic HTML structure with proper heading hierarchy
- Add JSON-LD structured data for Organization and WebSite
${settings.enableSitemap ? '- Generate XML sitemap reference' : ''}
- Optimize images with alt text
- Add canonical URL tag
- Ensure mobile-friendly responsive design
- Add robots.txt reference`;
    
    setInput?.(prompt);
    onSendMessage?.(prompt);
  };

  const handleAnalyticsPrompt = () => {
    const prompt = `Add Google Analytics 4 tracking to the website. Include:
- GA4 tracking code in the head section (use placeholder G-XXXXXXXXXX)
- Page view tracking for all sections
- Event tracking for:
  * Button clicks (CTAs, navigation)
  * Form submissions
  * Scroll depth (25%, 50%, 75%, 100%)
  * Time on page
- Conversion tracking for payment/pricing interactions
- User engagement metrics dashboard-ready structure`;
    
    setInput?.(prompt);
    onSendMessage?.(prompt);
  };

  const handleFormPrompt = (config: FormConfig) => {
    const prompt = `Add a lead capture form section to the website with these specifications:

Form Title: "${config.title}"
Description: "${config.description}"

Fields:
${config.fields.map(f => `- ${f.label} (${f.type})${f.required ? ' [Required]' : ' [Optional]'}${f.placeholder ? ` - placeholder: "${f.placeholder}"` : ''}`).join('\n')}

Submit Button: "${config.submitText}"
Success Message: "${config.successMessage}"

Additional Requirements:
${config.collectAnalytics ? '- Track form submissions with analytics' : ''}
${config.enableNotifications ? '- Show email notification confirmation' : ''}
- Style the form to match the website design
- Add client-side validation
- Show loading state during submission
- Clear form fields after successful submission`;

    setInput?.(prompt);
    onSendMessage?.(prompt);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.07] px-3 py-2.5 text-[11px] text-white/65 leading-relaxed">
        <span className="font-semibold text-teal-200/95">Business OS (Premium+)</span> — Save API keys once (Stripe, Firebase,
        Supabase, Vercel, GA4, Meta Pixel, email, GitHub). They are encrypted server-side and appear on your dashboard (
        <Link href="/business" className="text-teal-300 underline underline-offset-2 hover:text-teal-200">
          Overview
        </Link>
        ,{' '}
        <Link href="/business/integrations" className="text-teal-300 underline underline-offset-2 hover:text-teal-200">
          Integrations
        </Link>
        ). This tab only prepares chat prompts for your site.
      </div>
      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ' +
              (activeSection === section.id ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10')
            }
          >
            <i className={'fa-solid fa-' + section.icon} />
            {section.label}
          </button>
        ))}
      </div>

      {/* Section Header */}
      <div className="px-1">
        <p className="text-[11px] text-white/50">
          {sections.find(s => s.id === activeSection)?.desc}
          <span className="text-amber-400/80 block mt-1">
            <i className="fa-solid fa-robot mr-1" />
            Click any option to generate AI prompt
          </span>
        </p>
      </div>

      {/* Payments Section */}
      {activeSection === 'payments' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 flex-1 overflow-y-auto"
        >
          {[
            { id: 'stripe', name: 'Stripe', icon: 'cc-stripe', color: 'from-violet-500 to-purple-600', desc: 'Subscriptions & one-time payments' },
            { id: 'paypal', name: 'PayPal', icon: 'cc-paypal', color: 'from-blue-500 to-cyan-500', desc: 'Global payment buttons' },
            { id: 'razorpay', name: 'Razorpay', icon: 'credit-card', color: 'from-emerald-500 to-teal-500', desc: 'India-focused payments (UPI, Cards)' },
          ].map((provider) => (
            <div
              key={provider.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={'w-10 h-10 rounded-lg bg-gradient-to-br ' + provider.color + ' flex items-center justify-center flex-shrink-0'}>
                  <i className={'fa-brands fa-' + provider.icon + ' text-lg text-white'} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[13px] font-bold text-white group-hover:text-amber-400 transition-colors">{provider.name}</h4>
                  <p className="text-[11px] text-white/50">{provider.desc}</p>
                </div>
                <button
                  onClick={() => handlePaymentPrompt(provider.id)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-[11px] font-bold hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-wand-magic-sparkles" />
                  Add
                </button>
              </div>
            </div>
          ))}

          {/* Pricing Tier Quick Add */}
          <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/10">
            <h4 className="text-[12px] font-bold text-amber-400 mb-2">
              <i className="fa-solid fa-bolt mr-1" />
              Quick Add Pricing
            </h4>
            <div className="flex flex-wrap gap-2">
              {[
                { price: '$9', label: 'Starter' },
                { price: '$29', label: 'Basic' },
                { price: '$49', label: 'Pro' },
                { price: '$99', label: 'Business' },
                { price: '$199', label: 'Enterprise' },
              ].map((tier) => (
                <button
                  key={tier.price}
                  onClick={() => {
                    const prompt = 'Add a pricing section with a ' + tier.label + ' plan at ' + tier.price + ' per month. Include feature list, comparison with other tiers, and a prominent "Get Started" call-to-action button.';
                    setInput?.(prompt);
                    onSendMessage?.(prompt);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-white/80 text-xs font-bold hover:bg-amber-500/20 hover:text-amber-400 transition-all"
                >
                  {tier.price} {tier.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Forms Section */}
      {activeSection === 'forms' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-y-auto"
        >
          <FormBuilder
            onGenerateForm={handleFormPrompt}
          />
        </motion.div>
      )}

      {/* SEO Section */}
      {activeSection === 'seo' && (
        <SEOSection onGenerate={handleSEOPrompt} />
      )}

      {/* Analytics Section */}
      {activeSection === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 flex-1 overflow-y-auto"
        >
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-chart-line text-lg text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-[13px] font-bold text-white mb-1">Google Analytics 4</h4>
                <p className="text-[11px] text-white/60 mb-3">
                  Track visitors, conversions, and user behavior with comprehensive analytics setup.
                </p>
                <ul className="text-[10px] text-white/40 space-y-1 mb-3">
                  <li><i className="fa-solid fa-check text-emerald-400 mr-1" /> Page view tracking</li>
                  <li><i className="fa-solid fa-check text-emerald-400 mr-1" /> Event tracking (clicks, forms, scroll)</li>
                  <li><i className="fa-solid fa-check text-emerald-400 mr-1" /> Conversion tracking</li>
                  <li><i className="fa-solid fa-check text-emerald-400 mr-1" /> User engagement metrics</li>
                </ul>
                <button
                  onClick={handleAnalyticsPrompt}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[11px] font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-wand-magic-sparkles" />
                  Add Analytics Tracking
                </button>
              </div>
            </div>
          </div>

          {/* Additional Tracking Options */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Facebook Pixel', icon: 'facebook', color: 'from-blue-600 to-blue-700', desc: 'Ad conversion tracking' },
              { name: 'Hotjar', icon: 'fire', color: 'from-orange-500 to-red-500', desc: 'Heatmaps & recordings' },
            ].map((tool) => (
              <button
                key={tool.name}
                onClick={() => {
                  const prompt = 'Add ' + tool.name + ' tracking code to the website for ' + tool.desc.toLowerCase() + '. Include the necessary script in the head section with a placeholder ID that users can replace.';
                  setInput?.(prompt);
                  onSendMessage?.(prompt);
                }}
                className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left"
              >
                <i className={'fa-brands fa-' + tool.icon + ' text-white/60 mb-1'} />
                <h5 className="text-[11px] font-bold text-white">{tool.name}</h5>
                <p className="text-[9px] text-white/40">{tool.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// SEO Section Component
function SEOSection({ onGenerate }: { onGenerate: (settings: any) => void }) {
  const [settings, setSettings] = useState({
    siteTitle: '',
    description: '',
    keywords: '',
    enableSitemap: true,
  });

  const presets = [
    { name: 'SaaS Product', icon: 'rocket', desc: 'Software/Tech company' },
    { name: 'Agency', icon: 'briefcase', desc: 'Service business' },
    { name: 'E-commerce', icon: 'shopping-cart', desc: 'Online store' },
    { name: 'Portfolio', icon: 'palette', desc: 'Creative showcase' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 flex-1 overflow-y-auto"
    >
      {/* Presets */}
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              const prompts: Record<string, string> = {
                'SaaS Product': 'Optimize this SaaS website for SEO. Include proper title tags, meta descriptions, Open Graph tags, JSON-LD structured data for SoftwareApplication, pricing schema markup, and FAQ schema. Focus on conversion-oriented keywords.',
                'Agency': 'Optimize this agency website for local SEO. Include Service schema markup, LocalBusiness structured data, client testimonial schema, and service area targeting. Add portfolio rich snippets.',
                'E-commerce': 'Optimize this e-commerce website for product SEO. Include Product schema markup, breadcrumb structured data, review/rating schema, and category page optimization. Add shopping ads compatibility.',
                'Portfolio': 'Optimize this portfolio website for creative SEO. Include CreativeWork schema, ImageObject structured data for projects, person/author schema, and gallery optimization. Focus on visual search.',
              };
              const prompt = prompts[preset.name] || ('Optimize website for ' + preset.name + ' SEO');
              onGenerate({ ...settings, preset: preset.name });
            }}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left"
          >
            <i className={'fa-solid fa-' + preset.icon + ' text-amber-400 mb-1'} />
            <h5 className="text-[11px] font-bold text-white">{preset.name}</h5>
            <p className="text-[9px] text-white/40">{preset.desc}</p>
          </button>
        ))}
      </div>

      {/* Custom SEO Settings */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
        <h4 className="text-[12px] font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-sliders" />
          Custom SEO Settings
        </h4>

        <div>
          <label className="block text-[11px] text-white/60 mb-1">Page Title</label>
          <input
            type="text"
            value={settings.siteTitle}
            onChange={(e) => setSettings(s => ({ ...s, siteTitle: e.target.value }))}
            placeholder="My Amazing Product - Best in Class Solution"
            className="w-full bg-[#111118] border border-white/[0.1] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-white/25"
          />
        </div>

        <div>
          <label className="block text-[11px] text-white/60 mb-1">Meta Description</label>
          <textarea
            value={settings.description}
            onChange={(e) => setSettings(s => ({ ...s, description: e.target.value }))}
            placeholder="Describe your page in 150-160 characters..."
            rows={2}
            className="w-full bg-[#111118] border border-white/[0.1] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-white/25 resize-none"
          />
        </div>

        <div>
          <label className="block text-[11px] text-white/60 mb-1">Target Keywords</label>
          <input
            type="text"
            value={settings.keywords}
            onChange={(e) => setSettings(s => ({ ...s, keywords: e.target.value }))}
            placeholder="ai video, content creation, marketing automation"
            className="w-full bg-[#111118] border border-white/[0.1] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-white/25"
          />
        </div>

        <button
          onClick={() => onGenerate(settings)}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-wand-magic-sparkles" />
          Generate SEO Implementation
        </button>
      </div>
    </motion.div>
  );
}
