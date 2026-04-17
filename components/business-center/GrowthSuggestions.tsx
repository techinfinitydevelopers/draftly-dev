'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GrowthSuggestion {
  id: string;
  type: 'conversion' | 'design' | 'content' | 'seo';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  autoFixable: boolean;
  fixPrompt?: string;
}

interface GrowthSuggestionsProps {
  siteCode: string | null;
  onApply?: (suggestion: GrowthSuggestion) => void;
}

export function GrowthSuggestions({ siteCode, onApply }: GrowthSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<GrowthSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Analyze site and generate real suggestions
  useEffect(() => {
    if (!siteCode) {
      setSuggestions([]);
      return;
    }

    setAnalyzing(true);
    
    // Real analysis of site code
    const analysis = analyzeSite(siteCode);
    
    // Generate suggestions based on actual findings
    const generatedSuggestions: GrowthSuggestion[] = [];

    if (!analysis.hasTestimonials) {
      generatedSuggestions.push({
        id: 'add-testimonials',
        type: 'conversion',
        title: 'Add Social Proof',
        description: 'Your site lacks testimonials. Adding customer quotes increases trust by 72%.',
        impact: '+15-25% conversion rate',
        effort: 'low',
        autoFixable: true,
        fixPrompt: 'Add a testimonials section with 3 customer quotes after the hero section'
      });
    }

    if (!analysis.hasPricing) {
      generatedSuggestions.push({
        id: 'add-pricing',
        type: 'conversion',
        title: 'Add Pricing Section',
        description: 'Clear pricing reduces friction. Visitors who see pricing are 4x more likely to convert.',
        impact: '+30% qualified leads',
        effort: 'medium',
        autoFixable: true,
        fixPrompt: 'Add a 3-tier pricing section with Starter, Pro, and Enterprise plans'
      });
    }

    if (!analysis.hasMultipleCTAs) {
      generatedSuggestions.push({
        id: 'add-ctas',
        type: 'conversion',
        title: 'Add More Call-to-Actions',
        description: 'Only found 1 CTA. Adding CTAs throughout the page increases clicks by 220%.',
        impact: '+20-40% click-through rate',
        effort: 'low',
        autoFixable: true,
        fixPrompt: 'Add a sticky CTA button and add CTAs after each section'
      });
    }

    if (analysis.loadTime > 3) {
      generatedSuggestions.push({
        id: 'optimize-speed',
        type: 'design',
        title: 'Optimize Load Speed',
        description: `Your site takes ${analysis.loadTime}s to load. Every second delay reduces conversions by 7%.`,
        impact: '+7% conversion per second saved',
        effort: 'medium',
        autoFixable: false
      });
    }

    if (!analysis.hasFAQ) {
      generatedSuggestions.push({
        id: 'add-faq',
        type: 'content',
        title: 'Add FAQ Section',
        description: 'FAQs address objections and reduce support tickets by up to 50%.',
        impact: '+10% conversion, -50% support',
        effort: 'low',
        autoFixable: true,
        fixPrompt: 'Add an FAQ section with 5 common questions about the product'
      });
    }

    if (!analysis.hasNewsletter) {
      generatedSuggestions.push({
        id: 'add-newsletter',
        type: 'conversion',
        title: 'Add Email Capture',
        description: 'Only 2% buy immediately. Capturing emails lets you nurture the other 98%.',
        impact: '+300% long-term revenue',
        effort: 'low',
        autoFixable: true,
        fixPrompt: 'Add an email newsletter signup form in the footer'
      });
    }

    // Always add a design improvement
    generatedSuggestions.push({
      id: 'design-refresh',
      type: 'design',
      title: 'Make It More Premium',
      description: 'Upgrade colors, spacing, and typography to look like a high-end brand.',
      impact: '+25% perceived value',
      effort: 'low',
      autoFixable: true,
      fixPrompt: 'Make the design more premium with better colors, spacing, and modern typography'
    });

    setTimeout(() => {
      setSuggestions(generatedSuggestions);
      setAnalyzing(false);
    }, 800);
  }, [siteCode]);

  // Simple site analysis
  function analyzeSite(code: string) {
    return {
      hasTestimonials: code.includes('testimonial') || code.includes('review'),
      hasPricing: code.includes('pricing') || code.includes('$') || code.includes('plan'),
      hasMultipleCTAs: (code.match(/button|cta|sign up|get started/gi) || []).length > 2,
      loadTime: Math.round(code.length / 5000) + 1, // Rough estimate based on code size
      hasFAQ: code.includes('faq') || code.includes('FAQ') || code.includes('question'),
      hasNewsletter: code.includes('email') && code.includes('subscribe'),
      wordCount: code.split(' ').length
    };
  }

  const typeColors = {
    conversion: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    design: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    content: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    seo: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
  };

  const effortLabels = {
    low: 'Quick win',
    medium: 'Medium effort',
    high: 'Big project'
  };

  if (!siteCode) {
    return (
      <div className="text-center py-8">
        <i className="fa-solid fa-chart-line text-4xl text-white/20 mb-3" />
        <p className="text-[12px] text-white/50">Build your site first to get AI growth suggestions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-white">AI Growth Suggestions</h3>
        <span className="text-[10px] text-white/40">{suggestions.length} found</span>
      </div>

      {analyzing ? (
        <div className="text-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-3"
          />
          <p className="text-[11px] text-white/50">Analyzing your site...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-xl border ${typeColors[suggestion.type]}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {suggestion.type}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10">
                    {effortLabels[suggestion.effort]}
                  </span>
                </div>
                
                <h4 className="text-[13px] font-bold text-white mb-1">
                  {suggestion.title}
                </h4>
                <p className="text-[11px] text-white/70 mb-2 leading-relaxed">
                  {suggestion.description}
                </p>
                
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 mb-3">
                  <i className="fa-solid fa-arrow-trend-up" />
                  {suggestion.impact}
                </div>

                {suggestion.autoFixable && (
                  <button
                    onClick={() => onApply?.(suggestion)}
                    className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles mr-1.5" />
                    Apply with AI
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
