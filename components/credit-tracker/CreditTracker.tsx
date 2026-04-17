'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface CreditInfo {
  creditsUsed: number;
  creditsTotal: number;
  plan: string;
  remainingSites: number;
  totalSites: number;
}

interface CreditTrackerProps {
  creditsUsed: number;
  creditsTotal: number;
  plan: string;
  sitesUsed?: number;
  sitesTotal?: number;
  isUnlimited?: boolean;
}

export function CreditTracker({ 
  creditsUsed, 
  creditsTotal, 
  plan, 
  sitesUsed = 0, 
  sitesTotal = 0,
  isUnlimited = false
}: CreditTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const remaining = isUnlimited ? 999999 : Math.max(0, creditsTotal - creditsUsed);
  const percentage = isUnlimited ? 0 : (creditsTotal > 0 ? (creditsUsed / creditsTotal) * 100 : 0);
  const isLow = !isUnlimited && remaining < creditsTotal * 0.2;
  const isCritical = !isUnlimited && remaining < creditsTotal * 0.1;

  const planLabels: Record<string, string> = {
    free: 'Free',
    owner: 'Dev',
    tester: 'Tester',
    testing: 'Testing',
    basic: 'Basic',
    'basic-plus': 'Basic Plus',
    pro: 'Pro',
    premium: 'Premium'
  };

  return (
    <div className="relative">
      {/* Compact View */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          isCritical 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : isLow 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
        }`}
      >
        <i className={`fa-solid fa-coins ${isUnlimited ? 'text-emerald-400' : isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`} />
        <span className="text-[11px] font-medium">
          {isUnlimited ? 'Unlimited' : `${remaining.toLocaleString()} / ${creditsTotal.toLocaleString()}`}
        </span>
        <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] ml-1`} />
      </button>

      {/* Expanded View */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full right-0 mt-2 w-[280px] bg-[#0c0c16] border border-white/10 rounded-xl p-4 shadow-2xl z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-wallet text-violet-400" />
              <span className="text-[13px] font-bold text-white">Credits</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {planLabels[plan] || plan}
            </span>
          </div>

          {/* Credit Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-white/60">Used</span>
              <span className={isUnlimited ? 'text-emerald-400' : isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'}>
                {isUnlimited ? 'Unlimited' : `${creditsUsed.toLocaleString()} / ${creditsTotal.toLocaleString()}`}
              </span>
            </div>
            {!isUnlimited && (
              <>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    className={`h-full rounded-full ${
                      isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-white/40 mt-1">
                  {remaining.toLocaleString()} credits remaining
                </p>
              </>
            )}
            {isUnlimited && (
              <p className="text-[10px] text-emerald-400/80 mt-1">
                Dev account — no limits
              </p>
            )}
          </div>

          {/* Sites (if applicable) */}
          {sitesTotal > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-white/[0.03]">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-white/60">3D Sites</span>
                <span className="text-white">{isUnlimited ? 'Unlimited' : `${sitesUsed} / ${sitesTotal}`}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${(sitesUsed / sitesTotal) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Cost Info */}
          <div className="space-y-2 mb-4 text-[10px] text-white/50">
            <div className="flex justify-between">
              <span>Generate image</span>
              <span className="text-white/70">10 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Generate video (8s)</span>
              <span className="text-white/70">128 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Build website</span>
              <span className="text-white/70">600 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Edit/iterate</span>
              <span className="text-white/70">10-50 credits</span>
            </div>
          </div>

          {/* Upgrade Prompt */}
          {!isUnlimited && (isLow || isCritical) && (
            <div className="p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/20 mb-3">
              <p className="text-[11px] text-amber-300 mb-2">
                {isCritical 
                  ? '⚠️ Critical: You\'re almost out of credits!' 
                  : '⚡ Running low on credits'}
              </p>
              <Link
                href="/pricing"
                className="block w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[11px] font-bold text-center hover:opacity-90 transition-all"
              >
                Upgrade Plan
              </Link>
            </div>
          )}

          {/* Close */}
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full py-2 rounded-lg bg-white/5 text-white/70 text-[11px] hover:bg-white/10 transition-all"
          >
            Close
          </button>
        </motion.div>
      )}
    </div>
  );
}

export function CreditWarning({ remaining, total }: { remaining: number; total: number }) {
  const percentage = total > 0 ? (remaining / total) * 100 : 0;
  
  if (percentage > 20) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 ${
        percentage < 10 
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      <i className={`fa-solid fa-triangle-exclamation ${percentage < 10 ? 'text-red-400' : 'text-amber-400'}`} />
      <div>
        <p className={`text-[13px] font-medium ${percentage < 10 ? 'text-red-300' : 'text-amber-300'}`}>
          {percentage < 10 ? 'Critical: Low credits!' : 'Running low on credits'}
        </p>
        <p className="text-[11px] text-white/60">
          Only {remaining.toLocaleString()} credits remaining
        </p>
      </div>
      <Link
        href="/pricing"
        className={`ml-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
          percentage < 10 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-amber-500 text-black hover:bg-amber-600'
        }`}
      >
        Upgrade
      </Link>
    </motion.div>
  );
}
