'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface SearchResult {
  title: string;
  description: string;
  category: string;
  href: string;
  icon: string;
}

const SEARCH_DATA: SearchResult[] = [
  // Documentation
  { title: 'Getting Started', description: 'Quick start guide for new users', category: 'Documentation', href: '/docs/getting-started', icon: 'fa-book' },
  { title: 'Installation', description: 'Install and configure Draftly', category: 'Documentation', href: '/docs/installation', icon: 'fa-download' },
  { title: 'AI Prompt Guide', description: 'Write effective prompts for better results', category: 'Documentation', href: '/docs/prompt-guide', icon: 'fa-wand-magic-sparkles' },
  { title: '3D Website Builder', description: 'Pipeline, export, and how the builder works', category: 'Documentation', href: '/docs/3d-builder', icon: 'fa-cube' },
  { title: 'Motion & media', description: 'Video, images, and quality in the builder', category: 'Documentation', href: '/docs/3d-builder-models', icon: 'fa-film' },
  { title: 'Deployment', description: 'Deploy your generated projects', category: 'Documentation', href: '/docs/deployment', icon: 'fa-rocket' },
  // API Reference
  { title: 'Generate UI', description: 'POST /api/generate - Generate UI from prompt', category: 'API Reference', href: '/api-reference/generate', icon: 'fa-code' },
  { title: 'Enhance Prompt', description: 'POST /api/enhance-prompt - AI prompt enhancement', category: 'API Reference', href: '/api-reference/enhance-prompt', icon: 'fa-bolt' },
  { title: '3D Builder — Background', description: 'POST /api/3d-builder/generate-bg', category: 'API Reference', href: '/api-reference/builder-generate-bg', icon: 'fa-image' },
  { title: '3D Builder — Video', description: 'POST /api/3d-builder/generate-video', category: 'API Reference', href: '/api-reference/builder-generate-video', icon: 'fa-video' },
  // Pages
  { title: 'Dashboard', description: 'Your project dashboard', category: 'Pages', href: '/dashboard', icon: 'fa-grid-2' },
  { title: '3D Builder', description: 'Cinematic scroll sites from one prompt', category: 'Pages', href: '/3d-builder', icon: 'fa-cube' },
  { title: 'Pricing', description: 'Plans and pricing', category: 'Pages', href: '/pricing', icon: 'fa-tag' },
  { title: 'Changelog', description: 'Latest updates and releases', category: 'Pages', href: '/changelog', icon: 'fa-clock-rotate-left' },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filteredResults = query.trim()
    ? SEARCH_DATA.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_DATA.slice(0, 6);

  const groupedResults = filteredResults.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const flatResults = filteredResults;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault();
        router.push(flatResults[selectedIndex].href);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [flatResults, selectedIndex, router, onClose]
  );

  const handleResultClick = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-strong rounded-2xl overflow-hidden shadow-glass-lg">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                <i className="fa-solid fa-magnifying-glass text-white/30 text-sm" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search documentation, API, pages..."
                  className="flex-1 bg-transparent text-white text-base placeholder-white/30 focus:outline-none"
                />
                <div className="flex items-center gap-1.5">
                  <span className="kbd">ESC</span>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto py-2">
                {flatResults.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <i className="fa-solid fa-magnifying-glass text-white/10 text-3xl mb-3 block" />
                    <p className="text-white/30 text-sm">No results found for &ldquo;{query}&rdquo;</p>
                  </div>
                ) : (
                  Object.entries(groupedResults).map(([category, items]) => (
                    <div key={category} className="mb-1">
                      <div className="px-5 py-2">
                        <span className="text-[10px] font-mono font-medium text-white/25 uppercase tracking-wider">
                          {category}
                        </span>
                      </div>
                      {items.map((item) => {
                        const globalIndex = flatResults.indexOf(item);
                        return (
                          <button
                            key={item.href}
                            onClick={() => handleResultClick(item.href)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                              globalIndex === selectedIndex
                                ? 'bg-white/[0.06]'
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              globalIndex === selectedIndex ? 'bg-accent/10 text-accent' : 'bg-white/[0.04] text-white/30'
                            }`}>
                              <i className={`fa-solid ${item.icon} text-xs`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                globalIndex === selectedIndex ? 'text-white' : 'text-white/70'
                              }`}>
                                {item.title}
                              </p>
                              <p className="text-xs text-white/30 truncate">{item.description}</p>
                            </div>
                            {globalIndex === selectedIndex && (
                              <span className="kbd text-[9px]">↵</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 text-[10px] text-white/20">
                  <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> Navigate</span>
                  <span className="flex items-center gap-1"><span className="kbd">↵</span> Open</span>
                  <span className="flex items-center gap-1"><span className="kbd">ESC</span> Close</span>
                </div>
                <span className="text-[10px] text-white/15 font-mono">Powered by Draftly</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
