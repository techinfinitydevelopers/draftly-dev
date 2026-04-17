'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  category: 'foundation' | 'business' | 'growth' | 'launch';
  aiHelp?: string;
}

interface LaunchChecklistProps {
  siteCode: string | null;
  step: string;
}

export function LaunchChecklist({ siteCode, step }: LaunchChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([
    // Foundation
    { id: 'site-built', label: 'Build your 3D website', required: true, completed: false, category: 'foundation', aiHelp: 'Follow the chat prompts to create your site' },
    { id: 'preview-checked', label: 'Preview your site on mobile & desktop', required: true, completed: false, category: 'foundation' },
    { id: 'content-added', label: 'Add your business content', required: true, completed: false, category: 'foundation', aiHelp: 'Tell me: "add my product details"' },
    
    // Business
    { id: 'domain', label: 'Connect custom domain (optional)', required: false, completed: false, category: 'business' },
    { id: 'payments', label: 'Connect payment gateway', required: false, completed: false, category: 'business', aiHelp: 'Add payments by saying "enable payments"' },
    { id: 'pricing', label: 'Set up pricing plans', required: false, completed: false, category: 'business' },
    { id: 'forms', label: 'Add lead capture forms', required: false, completed: false, category: 'business', aiHelp: 'Say "add contact form"' },
    
    // Growth
    { id: 'seo', label: 'Optimize for search engines', required: false, completed: false, category: 'growth', aiHelp: 'Say "improve SEO"' },
    { id: 'analytics', label: 'Set up analytics tracking', required: false, completed: false, category: 'growth' },
    { id: 'social', label: 'Connect social media', required: false, completed: false, category: 'growth' },
    
    // Launch
    { id: 'test-payment', label: 'Test payment flow (if enabled)', required: false, completed: false, category: 'launch' },
    { id: 'download-backup', label: 'Download site backup', required: true, completed: false, category: 'launch' },
    { id: 'launch', label: 'Go live!', required: true, completed: false, category: 'launch' },
  ]);

  const [progress, setProgress] = useState(0);

  // Auto-check items based on state
  useEffect(() => {
    setItems(prev => prev.map(item => {
      if (item.id === 'site-built') {
        return { ...item, completed: !!siteCode && step === 'ready' };
      }
      if (item.id === 'content-added') {
        return { ...item, completed: !!siteCode && siteCode.length > 1000 };
      }
      return item;
    }));
  }, [siteCode, step]);

  // Calculate progress
  useEffect(() => {
    const requiredItems = items.filter(i => i.required);
    const completedRequired = requiredItems.filter(i => i.completed).length;
    const progressPercent = requiredItems.length > 0 ? (completedRequired / requiredItems.length) * 100 : 0;
    setProgress(Math.round(progressPercent));
  }, [items]);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const categories = ['foundation', 'business', 'growth', 'launch'] as const;
  const categoryLabels = {
    foundation: 'Foundation',
    business: 'Business Setup',
    growth: 'Growth & Marketing',
    launch: 'Launch'
  };

  const allRequiredDone = items.filter(i => i.required).every(i => i.completed);

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-white">Launch Progress</span>
          <span className="text-[12px] font-bold text-emerald-400">{progress}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-[10px] text-white/50 mt-2">
          {allRequiredDone 
            ? "🎉 Ready to launch! Complete optional items for better results."
            : "Complete required items to launch your site."}
        </p>
      </div>

      {/* Checklist by Category */}
      {categories.map((category) => {
        const categoryItems = items.filter(item => item.category === category);
        if (categoryItems.length === 0) return null;

        return (
          <div key={category} className="space-y-2">
            <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              {categoryLabels[category]}
            </h3>
            <div className="space-y-1">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    item.completed 
                      ? 'bg-emerald-500/[0.06] border-emerald-500/20' 
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.completed 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'border-white/30'
                  }`}>
                    {item.completed && <i className="fa-solid fa-check text-[10px] text-black" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[12px] ${item.completed ? 'text-white/60 line-through' : 'text-white'}`}>
                        {item.label}
                      </span>
                      {item.required && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">Required</span>
                      )}
                    </div>
                    {item.aiHelp && !item.completed && (
                      <p className="text-[10px] text-white/40 mt-1">
                        <i className="fa-solid fa-wand-magic-sparkles mr-1" />
                        {item.aiHelp}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
