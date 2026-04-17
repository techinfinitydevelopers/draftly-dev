'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveLocalProject } from '@/lib/local-projects';
import { devLog, devError } from '@/lib/client-log';

const themes = [
  { id: 'professional', name: 'Professional', icon: 'fa-briefcase', description: 'Clean corporate design with structured layouts' },
  { id: 'cinematic', name: 'Cinematic', icon: 'fa-film', description: 'Dramatic bold design with large visuals' },
  { id: 'gaming', name: 'Gaming', icon: 'fa-gamepad', description: 'Vibrant neon colors with glowing effects' },
  { id: 'minimal', name: 'Minimal', icon: 'fa-circle', description: 'Ultra-clean with maximum white space' },
  { id: 'luxury', name: 'Luxury', icon: 'fa-gem', description: 'Premium elegant with gold accents' },
];

const colorSchemes = [
  { id: 'dark', name: 'Dark', colors: ['#000000', '#1a1a1a', '#ffffff'], description: 'Dark mode' },
  { id: 'blue', name: 'Ocean Blue', colors: ['#0066cc', '#004c99', '#ffffff'], description: 'Professional blue' },
  { id: 'purple', name: 'Purple', colors: ['#6b46c1', '#553c9a', '#ffffff'], description: 'Creative purple' },
  { id: 'green', name: 'Forest Green', colors: ['#059669', '#047857', '#ffffff'], description: 'Natural green' },
  { id: 'orange', name: 'Sunset Orange', colors: ['#ea580c', '#c2410c', '#ffffff'], description: 'Energetic orange' },
];

export default function Dashboard() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string; code?: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showPreview, setShowPreview] = useState(true); // Start with preview expanded
  const [showCodeView, setShowCodeView] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('professional');
  const [selectedColor, setSelectedColor] = useState('dark');
  const [customApiKey, setCustomApiKey] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ [key: string]: string }>({});
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generationInProgressRef = useRef<string | null>(null); // Track if generation is already in progress
  const recognitionRef = useRef<any>(null);
  const progressRef = useRef<number>(0);
  const progressMessageRef = useRef<string>('');
  const { user, signInWithGoogle } = useAuth();
  const { subscription, isPro, canGenerate, generationsRemaining } = useSubscription();
  const router = useRouter();

  // Save generation state to localStorage
  const saveGenerationState = (state: {
    isGenerating: boolean;
    prompt: string;
    progress: number;
    progressMessage: string;
  }) => {
    localStorage.setItem('draftly_generation_state', JSON.stringify(state));
  };

  // Clear generation state from localStorage
  const clearGenerationState = () => {
    localStorage.removeItem('draftly_generation_state');
  };

  // Handle image upload and analysis
  const handleImageUpload = async (file: File) => {
    setAttachedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze image and convert to prompt
    setIsAnalyzingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', prompt);

      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.enhancedPrompt) {
          setPrompt(data.enhancedPrompt);
        }
      }
    } catch (error) {
      devError('Failed to analyze image', error);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Check if this is an iteration (partial update) or new generation
  const isIteration = (promptText: string): boolean => {
    if (!generatedCode) return false;
    
    // Free users get 5 chats/month; Pro/Premium get more. Server enforces limit.
    // If there's generated code, treat as iteration (chat) when keywords match
    // Keywords that suggest partial updates (but also allow general requests)
    const iterationKeywords = [
      'change', 'update', 'modify', 'edit', 'replace', 'fix', 'adjust',
      'make', 'set', 'add', 'remove', 'delete', 'move', 'resize',
      'color', 'font', 'text', 'button', 'section', 'header', 'footer',
      'hero', 'about', 'features', 'contact', 'image', 'logo', 'background',
      'style', 'design', 'layout', 'spacing', 'size', 'position'
    ];
    
    const lowerPrompt = promptText.toLowerCase();
    // If it contains iteration keywords, treat as iteration
    // Pro users can always iterate when there's generated code
    return iterationKeywords.some(keyword => lowerPrompt.includes(keyword));
  };

  const handleGenerateWithPrompt = async (promptToUse: string, initialProgress: number = 0, isResume: boolean = false) => {
    if (!promptToUse.trim() && !attachedImage) return;

    if (!user) {
      signInWithGoogle();
      return;
    }

    // Check if this is an iteration (partial update)
    const isPartialUpdate = isIteration(promptToUse) && generatedCode;
    
    // For iterations, we'll update only the specific part
    if (isPartialUpdate) {
      await handlePartialUpdate(promptToUse);
      return;
    }

    // Check generation limits (only for new generations, not resumes)
    if (!isResume && !canGenerate) {
      alert(`You've reached your generation limit (${subscription.generationsLimit} per month). Upgrade to Pro for 10 UI designs and 50 chats!`);
      router.push('/pricing');
      return;
    }

    // Prevent duplicate generations - if already generating the same prompt, don't restart
    const generationKey = `${promptToUse}_${Date.now()}`;
    if (!isResume && generationInProgressRef.current === promptToUse) {
      devLog('Generation already in progress for this prompt, skipping');
      return;
    }

    // Mark generation as in progress
    if (!isResume) {
      generationInProgressRef.current = promptToUse;
    }

    setIsGenerating(true);
    setProgress(initialProgress);
    const initialMessage = initialProgress > 0 ? 'Resuming generation...' : 'Initializing AI...';
    setProgressMessage(initialMessage);
    progressRef.current = initialProgress;
    progressMessageRef.current = initialMessage;
    
    const userMessage = { role: 'user', content: promptToUse };
    setMessages([...messages, userMessage]);
    const currentPrompt = promptToUse;
    setPrompt('');
    
    // Save initial state
    saveGenerationState({
      isGenerating: true,
      prompt: currentPrompt,
      progress: initialProgress,
      progressMessage: initialMessage,
    });

    // Progress simulation (4 minutes = 240 seconds)
    // Target: reach 95% in 4 minutes (160 intervals of 1.5 seconds)
    // Increment per interval: ~0.6% (95% / 160 intervals)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        // Smaller increment to take 4 minutes: 0.4-0.8% per interval
        const increment = Math.random() * 0.4 + 0.4; // 0.4-0.8% per interval
        const newProgress = Math.min(prev + increment, 95);
        progressRef.current = newProgress;
        
        // Save progress to localStorage
        saveGenerationState({
          isGenerating: true,
          prompt: currentPrompt,
          progress: newProgress,
          progressMessage: progressMessageRef.current || 'Generating...',
        });
        
        return newProgress;
      });
    }, 1500); // 1.5 second intervals for 4-minute completion

    // Update progress messages
    const messageInterval = setInterval(() => {
      const messages = [
        '🎨 Analyzing your requirements...',
        '🏗️ Building layout structure...',
        '🎨 Applying your color palette...',
        '✨ Adding smooth animations...',
        '📱 Optimizing for mobile devices...',
        '🚀 Powering up Draftly UI Machine...',
        '⚡ Generating professional code...',
        '🎯 Fine-tuning design details...',
        '💎 Polishing the interface...',
        '🔧 Assembling components...',
      ];
      const newMessage = messages[Math.floor(Math.random() * messages.length)];
      setProgressMessage(newMessage);
      progressMessageRef.current = newMessage;
      
      // Save updated message
      saveGenerationState({
        isGenerating: true,
        prompt: currentPrompt,
        progress: progressRef.current,
        progressMessage: newMessage,
      });
    }, 2500);

    try {
      // Build enhanced prompt with theme and color
      const themeInfo = themes.find(t => t.id === selectedTheme);
      const colorInfo = colorSchemes.find(c => c.id === selectedColor);
      
      // Check if user specified custom colors or fonts in their prompt
      const hasCustomColors = /(?:#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\(|hsl\()/i.test(currentPrompt);
      const hasCustomFonts = /(?:font|typeface|typography):\s*[\w\s,]+/i.test(currentPrompt);
      
      let enhancedPrompt = `Theme: ${themeInfo?.name} (${themeInfo?.description}). `;
      
      // Only add color scheme if user hasn't specified custom colors
      if (!hasCustomColors) {
        enhancedPrompt += `Color Scheme: ${colorInfo?.name} (${colorInfo?.description}). `;
      }
      
      enhancedPrompt += currentPrompt;
      
      // Add note about custom specifications
      if (hasCustomColors) {
        enhancedPrompt += ` [USER SPECIFIED CUSTOM COLORS - USE THEM EXACTLY AS DEFINED]`;
      }
      if (hasCustomFonts) {
        enhancedPrompt += ` [USER SPECIFIED CUSTOM FONTS - USE THEM EXACTLY AS DEFINED]`;
      }
      
      devLog('Sending request to /api/generate');
      devLog('Enhanced prompt', enhancedPrompt);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          originalPrompt: currentPrompt,
          theme: selectedTheme,
          colorScheme: selectedColor,
          userId: user?.uid || '',
          customApiKey: customApiKey || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.requiresUpgrade) {
          clearInterval(progressInterval);
          clearInterval(messageInterval);
          setIsGenerating(false);
          setError(errorData.error || 'Upgrade required to generate more UI previews');
          clearGenerationState();
          return;
        }
        throw new Error(errorData.error || 'Failed to generate');
      }

      // Clear intervals when generation completes (even if early)
      clearInterval(progressInterval);
      clearInterval(messageInterval);

      devLog('Response status', response.status);
      const data = await response.json();
      devLog('Response data keys', data && typeof data === 'object' ? Object.keys(data) : data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      if (data.code) {
        // If generation completes early, immediately show 100%
        setProgress(100);
        setProgressMessage('Complete!');
        setGeneratedCode(data.code);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '✓ Generated successfully! View the preview on the right.', code: data.code },
        ]);
        setShowPreview(true);
        
        // Clear generation state on success
        clearGenerationState();
        generationInProgressRef.current = null; // Clear generation tracking
        
        // Save project to localStorage
        try {
          const savedProject = saveLocalProject({
            prompt: currentPrompt,
            fullPrompt: enhancedPrompt,
            theme: selectedTheme,
            colorScheme: selectedColor,
            code: data.code,
          });
          devLog('Project saved to localStorage', savedProject.id);
        } catch (error) {
          devError('Failed to save project to localStorage', error);
        }
        
        // Reset progress after 2 seconds
        setTimeout(() => {
          setProgress(0);
          setProgressMessage('');
        }, 2000);
      } else {
        throw new Error('No code returned from API');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      setProgress(0);
      setProgressMessage('');
      setIsGenerating(false);
      generationInProgressRef.current = null; // Clear generation tracking
      setError(error.message || 'Failed to generate. Please try again.');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `✗ Error: ${error.message || 'Failed to generate. Please try again.'}` },
      ]);
      
      // Clear generation state on error
      clearGenerationState();
    }
  };

  useEffect(() => {
    // Check for preset prompt from profile page
    const presetPrompt = localStorage.getItem('draftly_preset_prompt');
    if (presetPrompt) {
      setPrompt(presetPrompt);
      localStorage.removeItem('draftly_preset_prompt');
    }
    
    // Check for pending prompt from homepage - AUTO-GENERATE
    const pendingPrompt = localStorage.getItem('draftly_pending_prompt');
    if (pendingPrompt && user) {
      localStorage.removeItem('draftly_pending_prompt');
      setPrompt(pendingPrompt);
      // Auto-generate after a short delay to ensure state is ready
      setTimeout(() => {
        if (pendingPrompt.trim() && !isGenerating) {
          handleGenerateWithPrompt(pendingPrompt);
        }
      }, 500);
    }

    // Restore generation state if user navigated away during generation
    const savedState = localStorage.getItem('draftly_generation_state');
    if (savedState && user) {
      try {
        const state = JSON.parse(savedState);
        if (state.isGenerating && state.prompt) {
          // Restore the generation state UI only (don't restart generation)
          setPrompt(state.prompt);
          setProgress(state.progress || 0);
          setProgressMessage(state.progressMessage || 'Generation in progress...');
          setIsGenerating(true);
          generationInProgressRef.current = state.prompt; // Mark as in progress
          
          // Note: We don't call handleGenerateWithPrompt here because the API call is already in progress
          // The progress will continue to update from the existing intervals if they're still running
          // If the generation completed while away, it will be handled when the user interacts
        }
      } catch (e) {
        devError('Failed to restore generation state', e);
        localStorage.removeItem('draftly_generation_state');
      }
    }
    
    // Load uploaded images from localStorage
    const loadUploadedImages = () => {
      const images: { [key: string]: string } = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('draftly_image_')) {
          const imageKey = key.replace('draftly_image_', '');
          images[imageKey] = localStorage.getItem(key) || '';
        }
      }
      setUploadedImages(images);
    };
    loadUploadedImages();

    // Initialize Web Speech API for voice input
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [user, isPro]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Handle partial updates (like Lovable/Cursor)
  const handlePartialUpdate = async (promptText: string) => {
    if (!generatedCode || !user) {
      setIsGenerating(false);
      return;
    }

    // Prevent multiple simultaneous requests
    if (isGenerating) {
      devLog('Already generating, skipping');
      return;
    }

    setIsGenerating(true);
    setProgressMessage('Updating specific section...');
    setProgress(10);
    setError(null); // Clear any previous errors

    const userMessage = { role: 'user', content: promptText };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          originalPrompt: promptText,
          theme: selectedTheme,
          colorScheme: selectedColor,
          userId: user.uid,
          isPartialUpdate: true,
          currentCode: generatedCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update');
      }

      const data = await response.json();
      if (data.code) {
        setProgress(100);
        setGeneratedCode(data.code);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `✓ Updated successfully! Changes applied to the specific section.`, code: data.code },
        ]);
        setPrompt('');
        setAttachedImage(null);
        setImagePreview(null);
      } else {
        throw new Error('No code returned from API');
      }
    } catch (error: any) {
      devError('Partial update error', error);
      setError(error.message || 'Failed to update');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `✗ Error: ${error.message || 'Failed to update'}` },
      ]);
    } finally {
      // Always reset generating state
      setIsGenerating(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !attachedImage) return;
    if (isGenerating) return; // Prevent multiple simultaneous requests
    
    // If image is attached, use the analyzed prompt
    const promptToUse = prompt.trim() || '';
    
    // Clear image after use
    if (attachedImage) {
      setAttachedImage(null);
      setImagePreview(null);
    }
    
    await handleGenerateWithPrompt(promptToUse);
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-obsidian via-charcoal to-obsidian flex flex-col relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      {/* Main Layout: Left Sidebar (Chat) + Right Side (Preview) */}
      <div className="flex-1 flex overflow-hidden pt-16 relative z-10">
        {/* Left Sidebar - Chat Section */}
        <div className="w-96 border-r border-stone/30 bg-charcoal flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-stone/30 bg-obsidian">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center">
                <i className="fa-solid fa-comments text-white text-xs"></i>
              </div>
              <div>
                <h2 className="text-white font-display text-lg font-semibold">Chat</h2>
                <p className="text-mist/60 text-xs">Iterate on your design</p>
              </div>
            </div>
          </div>

          {/* Generation Counter */}
          {user && (
            <div className={`p-3 mx-4 mt-4 border rounded-lg ${
              generationsRemaining === 0 
                ? 'bg-red-500/10 border-red-500/50' 
                : 'bg-stone/10 border-stone/30'
            }`}>
              <div className="flex items-center gap-2">
                <i className={`fa-solid fa-bolt text-base ${
                  generationsRemaining === 0 ? 'text-red-400' : 'text-orange-400'
                }`}></i>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {generationsRemaining} Remaining
                  </p>
                  <p className="text-white/50 text-xs truncate">
                    {isPro ? 'Pro' : 'Free'} Plan
                  </p>
                </div>
                {!isPro && generationsRemaining <= 3 && (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded transition flex-shrink-0"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Theme and Color Selection - Redesigned */}
          <div className="p-4 border-b border-stone/30 bg-charcoal/30">
            <div className="mb-4">
              <label className="text-white/80 text-xs font-semibold mb-3 block uppercase tracking-wider">Theme</label>
              <div className="grid grid-cols-5 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`p-2.5 border transition-all text-center rounded-lg min-w-0 ${
                      selectedTheme === theme.id
                        ? 'border-orange-500 bg-orange-500/10 text-white shadow-sm'
                        : 'border-stone/40 hover:border-stone/60 text-mist hover:text-white bg-obsidian/50'
                    }`}
                    title={theme.description}
                  >
                    <i className={`fa-solid ${theme.icon} text-base mb-1.5 block`}></i>
                    <span className="text-[9px] font-medium leading-tight block truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white/80 text-xs font-semibold mb-3 block uppercase tracking-wider">Color</label>
              <div className="grid grid-cols-5 gap-2">
                {colorSchemes.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`p-2.5 border transition-all rounded-lg min-w-0 ${
                      selectedColor === color.id
                        ? 'border-orange-500 bg-orange-500/10 shadow-sm'
                        : 'border-stone/40 hover:border-stone/60 bg-obsidian/50'
                    }`}
                    title={color.description}
                  >
                    <div className="flex gap-0.5 mb-1.5">
                      {color.colors.map((c, i) => (
                        <div
                          key={i}
                          className="flex-1 h-3.5 border border-stone/30 rounded"
                          style={{ backgroundColor: c }}
                        ></div>
                      ))}
                    </div>
                    <span className="text-[9px] font-medium text-white block truncate leading-tight">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <i className="fa-solid fa-comments text-4xl text-orange-400/30 mb-4"></i>
                  <p className="text-white/50 text-sm">Start a conversation to generate your website</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-3 border rounded-lg transition-colors ${
                    msg.role === 'user'
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-stone/10 border-stone/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 border border-orange-500/50 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-500/10">
                      {msg.role === 'user' ? (
                        <i className="fa-solid fa-user text-xs text-orange-400"></i>
                      ) : (
                        <i className="fa-solid fa-robot text-xs text-orange-400"></i>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs leading-relaxed break-words">{msg.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 border border-orange-500/30 bg-charcoal/80 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 border border-orange-500 rounded-full flex items-center justify-center bg-orange-500/10">
                    <i className="fa-solid fa-robot text-xs text-orange-400 animate-pulse"></i>
                  </div>
                  <p className="text-white text-xs font-mono">{progressMessage}</p>
                </div>
                <div className="w-full bg-obsidian h-2 overflow-hidden rounded-full border border-orange-500/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-white text-[10px] font-mono mt-1 text-right">{Math.round(progress)}%</p>
              </motion.div>
            )}
          </div>

          {/* Chat Input - Redesigned with Image Upload */}
          <div className="p-4 border-t border-stone/30 bg-charcoal/50">
            {/* Free users: show chats remaining; Pro/Premium get more */}
            {generatedCode && !isPro && (
              <div className="mb-3 p-3 bg-charcoal/50 border border-stone/40 rounded-lg">
                <p className="text-white/80 text-xs">Free: 5 chats per month. Upgrade to Pro for 50 chats.</p>
              </div>
            )}

            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone/40">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setAttachedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-0 right-0 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-bl-lg flex items-center justify-center text-[10px]"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>
                {isAnalyzingImage && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-spinner fa-spin text-white text-xs"></i>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1 bg-obsidian border border-stone/40 rounded-lg overflow-hidden">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder={
                    generatedCode 
                      ? "Request changes to specific sections..." 
                      : "Describe your website..."
                  }
                  className="w-full bg-transparent outline-none resize-none text-white placeholder-white/40 text-sm p-3 min-h-[60px] max-h-[120px]"
                  rows={2}
                />
                <div className="flex items-center justify-between px-3 pb-2 border-t border-stone/30">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => !(generatedCode && !isPro) && fileInputRef.current?.click()}
                      disabled={!!(generatedCode && !isPro)}
                      className="p-1.5 rounded hover:bg-stone/20 text-white/60 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach image"
                    >
                      <i className="fa-solid fa-image text-sm"></i>
                    </button>
                    <button
                      onClick={toggleVoiceInput}
                      disabled={!!(generatedCode && !isPro)}
                      className={`p-1.5 rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        isListening 
                          ? 'bg-orange-500 text-white' 
                          : 'hover:bg-stone/20 text-white/60 hover:text-white'
                      }`}
                      title={isListening ? 'Stop recording' : 'Start voice input'}
                    >
                      <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'} text-sm`}></i>
                    </button>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono">
                    {prompt.length} / 1000
                  </span>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && !attachedImage) || !!(generatedCode && !isPro)}
                className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition rounded-lg font-medium"
              >
                {isGenerating ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-paper-plane"></i>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Preview */}
        <div className="flex-1 flex flex-col bg-obsidian">
          {/* Preview Header */}
          <div className="p-4 border-b border-stone/30 bg-charcoal flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center">
                <i className={`fa-solid ${showCodeView ? 'fa-code' : 'fa-eye'} text-white text-xs`}></i>
              </div>
              <div>
                <h2 className="text-white font-display text-lg font-semibold">{showCodeView ? 'Code' : 'Preview'}</h2>
                <p className="text-mist/60 text-xs">{showCodeView ? 'View generated HTML code' : `Previewing ${generatedCode ? 'latest version' : 'last saved version'}`}</p>
              </div>
            </div>
            {generatedCode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCodeView(!showCodeView)}
                  className={`px-3 py-1.5 text-xs rounded transition font-medium ${
                    showCodeView 
                      ? 'text-white bg-stone/20 hover:bg-stone/30 border border-stone/40' 
                      : 'text-white bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  <i className={`fa-solid ${showCodeView ? 'fa-eye' : 'fa-code'} mr-1`}></i>
                  {showCodeView ? 'Preview' : 'Code'}
                </button>
                <button
                  onClick={downloadCode}
                  className="px-3 py-1.5 text-xs text-white bg-orange-500 hover:bg-orange-600 rounded transition font-medium"
                >
                  <i className="fa-solid fa-download mr-1"></i>
                  Download
                </button>
              </div>
            )}
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-hidden relative">
            {generatedCode ? (
              showCodeView ? (
                <div className="h-full overflow-auto bg-obsidian p-4">
                  <pre className="text-xs text-white/90 font-mono whitespace-pre-wrap break-words">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              ) : (
                <iframe
                  srcDoc={generatedCode}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              )
            ) : isGenerating ? (
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-graphite via-charcoal to-obsidian relative overflow-hidden">
                {/* Animated Background Particles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-orange-400/30 rounded-full"
                      initial={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight,
                        scale: 0,
                      }}
                      animate={{
                        y: [null, Math.random() * window.innerHeight],
                        x: [null, Math.random() * window.innerWidth],
                        scale: [0, 1, 0],
                        opacity: [0, 0.6, 0],
                      }}
                      transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>

                {/* Main Content */}
                <div className="text-center relative z-10">
                  {/* Animated Logo/Icon */}
                  <motion.div
                    className="mb-8 relative"
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0"
                      >
                        <i className="fa-solid fa-cog text-8xl text-orange-400/20"></i>
                      </motion.div>
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="relative"
                      >
                        <i className="fa-solid fa-wand-magic-sparkles text-6xl text-orange-400"></i>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Progress Message with Typewriter Effect */}
                  <motion.div
                    key={progressMessage}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                    className="mb-6"
                  >
                    <h2 className="text-white text-2xl font-display mb-2 font-bold">
                      {progressMessage}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 bg-orange-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-orange-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-orange-400 rounded-full"
                      />
                    </div>
                  </motion.div>

                  {/* Progress Bar */}
                  <div className="w-80 mx-auto mb-4">
                    <div className="w-full bg-obsidian/50 h-3 rounded-full overflow-hidden border border-orange-500/30">
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-full relative overflow-hidden"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                      </motion.div>
                    </div>
                    <motion.p
                      key={progress}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-orange-400 text-sm font-mono mt-2 font-bold"
                    >
                      {Math.round(progress)}%
                    </motion.p>
                  </div>

                  {/* Fun Status Messages */}
                  <motion.p
                    key={progress}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-white/50 text-xs font-mono"
                  >
                    {progress < 25 && "🎨 Crafting your vision..."}
                    {progress >= 25 && progress < 50 && "⚡ Powering up the magic..."}
                    {progress >= 50 && progress < 75 && "✨ Adding the finishing touches..."}
                    {progress >= 75 && progress < 95 && "🚀 Almost there..."}
                    {progress >= 95 && "🎉 Finalizing your masterpiece..."}
                  </motion.p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-charcoal/30">
                <div className="text-center">
                  <i className="fa-solid fa-code text-4xl text-orange-400/30 mb-4"></i>
                  <p className="text-white/50 text-sm font-mono">
                    Your generated interface will appear here
                  </p>
                  <p className="text-white/30 text-xs font-mono mt-2">
                    Start a conversation to generate your website
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
