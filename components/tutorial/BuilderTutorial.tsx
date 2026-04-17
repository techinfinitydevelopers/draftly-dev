'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Builder Console',
    description: 'This is your command center for creating stunning 3D scroll-driven websites with AI. Everything you need is right here!',
    target: 'chat-header',
    position: 'bottom'
  },
  {
    id: 'console',
    title: 'Builder Console',
    description: 'This is where you guide the AI. Type your ideas, confirm generated assets, and watch your website come to life step by step.',
    target: 'chat-input',
    position: 'top'
  },
  {
    id: 'pipeline',
    title: 'Build Pipeline',
    description: 'Track your progress through 5 stages: Describe → Hero Image → Video Motion → Frame Extraction → Final Website',
    target: 'chat-panel',
    position: 'right'
  },
  {
    id: 'preview',
    title: 'Live Preview',
    description: 'Watch your 3D background and website update in real-time as each stage completes. This is your canvas!',
    target: 'preview-panel',
    position: 'left'
  },
  {
    id: 'models',
    title: 'Models & Quality',
    description: 'Image: Nano Banana Pro or Nano Banana (API-Easy, Premium+). Video: Veo 3.1 Fast (Google / API-Easy) default on Basic+; optional LTX 2.3 Fast (fal). Premium ($200+) adds 2K/4K output.',
    target: 'pipeline-tab',
    position: 'bottom'
  },
  {
    id: 'ship',
    title: 'Ship Your Site',
    description: 'When your website is ready, open the "Ship" tab for full-screen preview, ZIP download (Premium+), and code.',
    target: 'preview-panel',
    position: 'left'
  }
];

interface BuilderTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function BuilderTutorial({ isOpen, onClose, onComplete }: BuilderTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<string | null>(null);

  const step = tutorialSteps[currentStep];

  useEffect(() => {
    if (isOpen && step) {
      setHighlightElement(step.target);
      // Scroll element into view if needed
      const element = document.getElementById(step.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isOpen, currentStep, step]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen || !step) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={handleSkip} />
      
      {/* Highlight box */}
      {highlightElement && (
        <HighlightBox targetId={highlightElement} />
      )}

      {/* Tutorial Card - Redesigned */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[400px] bg-gradient-to-br from-[#0c0c14] to-[#0a0a10] border border-white/[0.12] rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.6)] pointer-events-auto"
        >
          {/* Header with step indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center">
                <span className="text-sm font-bold text-cyan-300">{currentStep + 1}</span>
              </div>
              <span className="text-[11px] text-white/40 font-medium">of {tutorialSteps.length}</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded hover:bg-white/5"
            >
              Skip tour
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-1 mb-5">
            {tutorialSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  idx < currentStep ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 
                  idx === currentStep ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 
                  'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="mb-6">
            <h3 className="text-[16px] font-bold text-white mb-2 tracking-tight">{step.title}</h3>
            <p className="text-[13px] text-white/60 leading-relaxed">{step.description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 text-[12px] font-medium hover:bg-white/[0.1] hover:text-white transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black text-[12px] font-bold hover:from-cyan-400 hover:to-cyan-300 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Continue'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HighlightBox({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      const element = document.getElementById(targetId);
      if (element) {
        setRect(element.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [targetId]);

  if (!rect) return null;

  return (
    <div
      className="absolute pointer-events-none transition-all duration-300"
      style={{
        left: rect.left - 8,
        top: rect.top - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 4px rgba(52,211,153,0.5)',
        borderRadius: 12,
      }}
    />
  );
}

export function TutorialButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium hover:bg-violet-500/20 transition-all"
    >
      <i className="fa-solid fa-graduation-cap" />
      Start Tutorial
    </button>
  );
}
