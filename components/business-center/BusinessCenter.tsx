'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LaunchChecklist } from './LaunchChecklist';
import { GrowthSuggestions } from './GrowthSuggestions';
import { BusinessSettings } from './BusinessSettings';
import { ContentGenerator } from './ContentGenerator';
import { ComponentLibrary, ComponentTemplate } from '@/components/component-library/ComponentLibrary';

type Tab = 'launch' | 'growth' | 'business' | 'content' | 'components';

interface BusinessCenterProps {
  siteCode: string | null;
  bgImageUrl: string | null;
  videoBase64: string | null;
  step: string;
  onApplySuggestion?: (suggestion: any) => void;
  onAddComponent?: (template: ComponentTemplate) => void;
  setInput?: (value: string) => void;
  onSendMessage?: (text: string) => void;
}

export function BusinessCenter({ siteCode, bgImageUrl, videoBase64, step, onApplySuggestion, onAddComponent, setInput, onSendMessage }: BusinessCenterProps) {
  const [activeTab, setActiveTab] = useState<Tab>('launch');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'launch', label: 'Launch', icon: 'rocket' },
    { id: 'growth', label: 'Growth', icon: 'chart-line' },
    { id: 'components', label: 'Components', icon: 'cubes' },
    { id: 'business', label: 'Business', icon: 'briefcase' },
    { id: 'content', label: 'Content', icon: 'pen-nib' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a12] border-l border-white/[0.06]">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <i className={`fa-solid fa-${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
                {activeTab === 'launch' && <LaunchChecklist siteCode={siteCode} step={step} />}
                {activeTab === 'growth' && <GrowthSuggestions siteCode={siteCode} onApply={onApplySuggestion} />}
                {activeTab === 'components' && <ComponentLibrary onSelectComponent={(template) => onAddComponent?.(template)} />}
                {activeTab === 'business' && (
                  <BusinessSettings 
                    setInput={setInput}
                    onSendMessage={onSendMessage}
                  />
                )}
                {activeTab === 'content' && <ContentGenerator siteCode={siteCode} bgImageUrl={bgImageUrl} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
