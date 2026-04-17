'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { devError } from '@/lib/client-log';

const themes = [
    { id: 'cinematic', name: 'Cinematic', gradient: 'from-amber-900 via-yellow-600 to-amber-800', icon: '🎬' },
    { id: 'colorful', name: 'Colorful', gradient: 'from-pink-500 via-purple-500 to-blue-500', icon: '🌈' },
    { id: 'minimal', name: 'Minimal', gradient: 'from-gray-100 via-white to-gray-200', icon: '⚪' },
    { id: 'dark-pro', name: 'Dark Pro', gradient: 'from-slate-900 via-gray-900 to-black', icon: '🌑' },
];

const buildSteps = [
    { id: 'design', label: 'Design System Created', icon: '🎨', status: 'complete' },
    { id: 'homepage', label: 'Homepage Generated', icon: '🏠', status: 'complete' },
    { id: 'animations', label: 'Animations Added', icon: '✨', status: 'complete' },
    { id: 'cart', label: 'Cart Integrated', icon: '🛒', status: 'in-progress' },
    { id: 'payments', label: 'Payments Connected', icon: '💳', status: 'pending' },
];

export default function BuilderDashboard() {
    const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'assets'>('preview');
    const [selectedTheme, setSelectedTheme] = useState('cinematic');
    const [selectedColor, setSelectedColor] = useState('dark');
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<Array<{ role: string; content: string; code?: string }>>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    const [isFullPreview, setIsFullPreview] = useState(false);
    const [attachedImage, setAttachedImage] = useState<File | null>(null);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [hasGeneratedUI, setHasGeneratedUI] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user, signInWithGoogle } = useAuth();
    const { subscription, isPro, canGenerate, generationsRemaining } = useSubscription();
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        setAttachedImage(file);
    };

    const handleRemoveImage = () => {
        setAttachedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim() && !attachedImage) return;

        if (!user) {
            signInWithGoogle();
            return;
        }

        // Check if free user has already generated UI
        if (!isPro && hasGeneratedUI) {
            alert('You\'ve reached your 5 UI designs for this month. Upgrade to Pro for 10 UI designs and 50 chats!');
            router.push('/pricing');
            return;
        }

        if (!canGenerate) {
            alert(`You've reached your generation limit (5 for free users). Upgrade to Pro for 10 UI designs and 50 chats!`);
            router.push('/pricing');
            return;
        }

        setIsGenerating(true);
        setProgress(0);
        setProgressMessage('Initializing AI...');

        let finalPrompt = prompt;

        // Analyze image if attached
        if (attachedImage) {
            setIsAnalyzingImage(true);
            setProgressMessage('🖼️ Analyzing your reference image...');

            try {
                const formData = new FormData();
                formData.append('image', attachedImage);
                formData.append('prompt', prompt);

                const analysisResponse = await fetch('/api/analyze-image', {
                    method: 'POST',
                    body: formData,
                });

                if (!analysisResponse.ok) {
                    throw new Error('Failed to analyze image');
                }

                const analysisData = await analysisResponse.json();
                finalPrompt = analysisData.enhancedPrompt;

                setIsAnalyzingImage(false);
            } catch (error: any) {
                setIsAnalyzingImage(false);
                alert('Failed to analyze image: ' + error.message);
                setIsGenerating(false);
                return;
            }
        }

        const userMessage = { role: 'user', content: prompt || 'Generate UI based on attached image' };
        setMessages([...messages, userMessage]);
        setPrompt('');
        setAttachedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Progress simulation
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev;
                return Math.min(prev + Math.random() * 0.6 + 0.4, 95);
            });
        }, 1500);

        const messageInterval = setInterval(() => {
            const msgs = [
                '🎨 Analyzing your requirements...',
                '🏗️ Building layout structure...',
                '🎨 Applying your color palette...',
                '✨ Adding smooth animations...',
                '📱 Optimizing for mobile devices...',
                '🚀 Powering up Draftly UI Machine...',
            ];
            setProgressMessage(msgs[Math.floor(Math.random() * msgs.length)]);
        }, 2500);

        try {
            const themeInfo = themes.find(t => t.id === selectedTheme);
            const enhancedPrompt = `Theme: ${themeInfo?.name}. ${finalPrompt}`;

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: enhancedPrompt,
                    originalPrompt: finalPrompt,
                    theme: selectedTheme,
                    userId: user?.uid || '',
                }),
            });

            clearInterval(progressInterval);
            clearInterval(messageInterval);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate');
            }

            const data = await response.json();

            if (data.code) {
                setProgress(100);
                setProgressMessage('Complete!');
                setGeneratedCode(data.code);
                setHasGeneratedUI(true); // Mark that UI has been generated
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: '✓ Generated successfully! View the preview on the right.', code: data.code },
                ]);
                setActiveTab('preview');

                // Increment generation count
                if (user && db) {
                    try {
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                            'subscription.generationsUsed': increment(1)
                        });
                    } catch (error) {
                        devError('Failed to increment generation count', error);
                    }
                }

                setTimeout(() => {
                    setProgress(0);
                    setProgressMessage('');
                    setIsGenerating(false);
                }, 2000);
            }
        } catch (error: any) {
            clearInterval(progressInterval);
            clearInterval(messageInterval);
            setProgress(0);
            setProgressMessage('');
            setIsGenerating(false);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: `✗ Error: ${error.message}` },
            ]);
        }
    };

    const downloadProject = () => {
        const blob = new Blob([generatedCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'project.html';
        a.click();
    };

    if (isFullPreview && generatedCode) {
        return (
            <div className="fixed inset-0 z-50 bg-black">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button
                        onClick={() => setIsFullPreview(false)}
                        className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-lg hover:bg-white/20 transition"
                    >
                        <i className="fa-solid fa-times mr-2"></i>
                        Exit Preview
                    </button>
                </div>
                <iframe
                    srcDoc={generatedCode}
                    className="w-full h-full border-0"
                    title="Full Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex flex-col relative">
            <GrungeBackground />
            <div className="relative z-10">
                <Header />
            </div>

            {/* Main Split Layout */}
            <div className="flex-1 flex overflow-hidden pt-16 relative z-10">
                {/* LEFT PANEL - Chat Interface */}
                <div className="w-[420px] border-r border-white/10 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-xl flex flex-col">
                    {/* Project Header */}
                    <div className="p-6 border-b border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80">
                        <div className="mb-6">
                            <h1 className="text-white font-bold text-xl mb-1 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Sweet Digital Dreams</h1>
                            <p className="text-white/50 text-sm">Lovable Style Premium</p>
                        </div>

                        {/* Theme Selector - Enhanced */}
                        <div className="mb-6">
                            <label className="text-white/70 text-xs font-semibold mb-3 block uppercase tracking-wider">
                                <i className="fa-solid fa-palette mr-2"></i>
                                Choose Theme
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {themes.map((theme) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSelectedTheme(theme.id)}
                                        className={`relative p-4 rounded-xl transition-all duration-300 group ${selectedTheme === theme.id
                                            ? 'bg-gradient-to-br ' + theme.gradient + ' shadow-2xl scale-105'
                                            : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        {/* Glow Effect */}
                                        {selectedTheme === theme.id && (
                                            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${theme.gradient} blur-xl opacity-50 -z-10`}></div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            <div className={`text-2xl transition-transform group-hover:scale-110 ${selectedTheme === theme.id ? 'drop-shadow-lg' : ''
                                                }`}>
                                                {theme.icon}
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className={`font-semibold text-sm ${selectedTheme === theme.id ? 'text-white' : 'text-white/90'
                                                    }`}>
                                                    {theme.name}
                                                </p>
                                                <p className={`text-xs ${selectedTheme === theme.id ? 'text-white/80' : 'text-white/50'
                                                    }`}>
                                                    {theme.id === 'cinematic' ? 'Bold & Dramatic' :
                                                        theme.id === 'colorful' ? 'Vibrant & Fun' :
                                                            theme.id === 'minimal' ? 'Clean & Simple' :
                                                                'Professional'}
                                                </p>
                                            </div>
                                            {selectedTheme === theme.id && (
                                                <i className="fa-solid fa-check text-white text-sm"></i>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Scheme Selector - Enhanced */}
                        <div>
                            <label className="text-white/70 text-xs font-semibold mb-3 block uppercase tracking-wider">
                                <i className="fa-solid fa-droplet mr-2"></i>
                                Color Scheme
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'dark', name: 'Dark', colors: ['#000000', '#1a1a1a', '#333333'], icon: '🌑' },
                                    { id: 'blue', name: 'Ocean', colors: ['#0066cc', '#004c99', '#0080ff'], icon: '🌊' },
                                    { id: 'purple', name: 'Purple', colors: ['#6b46c1', '#553c9a', '#8b5cf6'], icon: '💜' },
                                    { id: 'orange', name: 'Sunset', colors: ['#ea580c', '#c2410c', '#fb923c'], icon: '🌅' },
                                ].map((color) => (
                                    <button
                                        key={color.id}
                                        onClick={() => setSelectedColor(color.id)}
                                        className={`relative p-3 rounded-lg transition-all duration-300 group ${selectedColor === color.id
                                            ? 'bg-white/10 border-2 border-white/30 shadow-xl'
                                            : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10'
                                            }`}
                                    >
                                        {/* Glow Effect for Selected */}
                                        {selectedColor === color.id && (
                                            <div className="absolute inset-0 rounded-lg bg-white/20 blur-md -z-10"></div>
                                        )}

                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">{color.icon}</span>
                                            <span className={`text-sm font-semibold ${selectedColor === color.id ? 'text-white' : 'text-white/80'
                                                }`}>
                                                {color.name}
                                            </span>
                                            {selectedColor === color.id && (
                                                <i className="fa-solid fa-check text-white text-xs ml-auto"></i>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            {color.colors.map((c, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 h-6 rounded border border-white/20 shadow-inner transition-transform group-hover:scale-105"
                                                    style={{ backgroundColor: c }}
                                                ></div>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <AnimatePresence>
                            {messages.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                        <i className="fa-solid fa-wand-magic-sparkles text-white text-2xl"></i>
                                    </div>
                                    <p className="text-white/70 text-sm">Start building your dream website</p>
                                    <p className="text-white/40 text-xs mt-2">Describe what you want to create</p>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                            <i className="fa-solid fa-robot text-white text-xs"></i>
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                        : 'bg-white/5 text-white border border-white/10'
                                        }`}>
                                        <p className="text-sm leading-relaxed">{msg.content}</p>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                                            <i className="fa-solid fa-user text-white text-xs"></i>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {isGenerating && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-3"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                    <i className="fa-solid fa-robot text-white text-xs animate-pulse"></i>
                                </div>
                                <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white text-sm mb-3">{progressMessage}</p>
                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                            initial={{ width: '0%' }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                    <p className="text-white/50 text-xs mt-2">{Math.round(progress)}%</p>
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Build Breakdown */}
                    <div className="border-t border-white/10 p-6">
                        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-list-check"></i>
                            Build Breakdown
                        </h3>
                        <div className="space-y-2">
                            {buildSteps.map((step) => (
                                <div key={step.id}>
                                    <button
                                        onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition group"
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.status === 'complete' ? 'bg-green-500' :
                                            step.status === 'in-progress' ? 'bg-yellow-500 animate-pulse' :
                                                'bg-white/20'
                                            }`}>
                                            {step.status === 'complete' ? (
                                                <i className="fa-solid fa-check text-white text-xs"></i>
                                            ) : step.status === 'in-progress' ? (
                                                <i className="fa-solid fa-spinner fa-spin text-white text-xs"></i>
                                            ) : (
                                                <i className="fa-solid fa-circle text-white/50 text-xs"></i>
                                            )}
                                        </div>
                                        <span className="text-sm flex-1 text-left">{step.icon} {step.label}</span>
                                        <i className={`fa-solid fa-chevron-down text-white/50 text-xs transition-transform ${expandedStep === step.id ? 'rotate-180' : ''
                                            }`}></i>
                                    </button>
                                    {expandedStep === step.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="ml-9 mt-2 p-3 bg-white/5 rounded-lg text-xs text-white/70"
                                        >
                                            Details about {step.label}...
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="border-t border-white/10 p-4 bg-slate-950/50">
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                onClick={downloadProject}
                                disabled={!generatedCode}
                                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i className="fa-solid fa-download mr-2"></i>
                                Download
                            </button>
                            {!isPro && (
                                <button
                                    onClick={() => router.push('/pricing')}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-sm font-semibold rounded-lg transition"
                                >
                                    <i className="fa-solid fa-crown mr-2"></i>
                                    Upgrade
                                </button>
                            )}
                        </div>

                        {/* Image Attachment Preview */}
                        {attachedImage && (
                            <div className="mb-3 p-3 bg-white/5 border border-white/10 rounded-lg flex items-center gap-3">
                                <i className="fa-solid fa-image text-blue-400"></i>
                                <span className="text-white text-sm flex-1 truncate">{attachedImage.name}</span>
                                <button
                                    onClick={handleRemoveImage}
                                    className="text-red-400 hover:text-red-300 transition"
                                >
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            </div>
                        )}

                        {/* Free: 5 chats/month; Pro: 50 */}
                        {!isPro && hasGeneratedUI && (
                            <div className="mb-3 p-3 bg-charcoal/50 border border-stone/40 rounded-lg">
                                <p className="text-white/80 text-xs">Free: 5 chats per month. Upgrade to Pro for 50 chats.</p>
                            </div>
                        )}

                        {/* Chat Input */}
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleGenerate();
                                            }
                                        }}
                                        placeholder={hasGeneratedUI ? "Request changes to your design..." : "Describe what you want to build..."}
                                        className="w-full bg-transparent outline-none resize-none text-white placeholder-white/40 text-sm"
                                        rows={2}
                                    />
                                    <div className="flex items-center gap-2 mt-2">
                                        {/* Image Attachment Button */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageAttach}
                                            className="hidden"
                                            disabled={!isPro && hasGeneratedUI}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={!isPro && hasGeneratedUI}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/70 text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Attach reference image"
                                        >
                                            <i className="fa-solid fa-image mr-1"></i>
                                            {attachedImage ? 'Change Image' : 'Attach Image'}
                                        </button>
                                        <span className="text-xs text-white/40 ml-auto">
                                            {generationsRemaining} generations left
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || (!prompt.trim() && !attachedImage) || (!isPro && hasGeneratedUI)}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
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

                {/* RIGHT PANEL - Code/Preview/Assets */}
                <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                    {/* Top Bar */}
                    <div className="border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setActiveTab('code')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'code'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <i className="fa-solid fa-code mr-2"></i>
                                    Code
                                </button>
                                <button
                                    onClick={() => setActiveTab('preview')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'preview'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <i className="fa-solid fa-eye mr-2"></i>
                                    Preview
                                </button>
                                <button
                                    onClick={() => setActiveTab('assets')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'assets'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <i className="fa-solid fa-images mr-2"></i>
                                    Assets
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {generatedCode && (
                                    <>
                                        <button
                                            onClick={() => setIsFullPreview(true)}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition"
                                        >
                                            <i className="fa-solid fa-expand mr-2"></i>
                                            Preview Site
                                        </button>
                                        <button
                                            onClick={downloadProject}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm transition"
                                        >
                                            <i className="fa-solid fa-download mr-2"></i>
                                            Download Project
                                        </button>
                                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition">
                                            <i className="fa-solid fa-share mr-2"></i>
                                            Share
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden">
                        {activeTab === 'code' && (
                            <div className="h-full flex">
                                {/* File Tree */}
                                <div className="w-64 border-r border-white/10 bg-slate-950/50 p-4 overflow-y-auto">
                                    <h3 className="text-white/70 text-xs font-semibold mb-3 uppercase tracking-wider">Project Files</h3>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 text-sm transition group">
                                            <i className="fa-solid fa-file-code text-blue-400 group-hover:scale-110 transition"></i>
                                            <span className="flex-1">index.html</span>
                                            <span className="text-xs text-white/40">12 KB</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer text-white/60 text-sm transition group">
                                            <i className="fa-solid fa-file-code text-purple-400 group-hover:scale-110 transition"></i>
                                            <span className="flex-1">styles.css</span>
                                            <span className="text-xs text-white/40">8 KB</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer text-white/60 text-sm transition group">
                                            <i className="fa-solid fa-file-code text-yellow-400 group-hover:scale-110 transition"></i>
                                            <span className="flex-1">script.js</span>
                                            <span className="text-xs text-white/40">4 KB</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer text-white/60 text-sm transition group">
                                            <i className="fa-solid fa-folder text-orange-400 group-hover:scale-110 transition"></i>
                                            <span className="flex-1">assets/</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Code Editor with Syntax Highlighting */}
                                <div className="flex-1 bg-[#1e1e1e] overflow-auto relative">
                                    {generatedCode ? (
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-file-code text-blue-400"></i>
                                                    <span className="text-white/80 text-sm font-mono">index.html</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(generatedCode);
                                                    }}
                                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/70 text-xs transition"
                                                >
                                                    <i className="fa-solid fa-copy mr-1"></i>
                                                    Copy
                                                </button>
                                            </div>
                                            <pre className="text-sm font-mono leading-relaxed">
                                                <code className="language-html text-white/90">{generatedCode}</code>
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="text-center">
                                                <i className="fa-solid fa-code text-white/20 text-5xl mb-4"></i>
                                                <p className="text-white/50 text-sm">Your generated code will appear here</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'preview' && (
                            <div className="h-full bg-white">
                                {generatedCode ? (
                                    <iframe
                                        srcDoc={generatedCode}
                                        className="w-full h-full border-0"
                                        title="Preview"
                                        sandbox="allow-scripts allow-same-origin allow-forms"
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                                        <div className="text-center">
                                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                                <i className="fa-solid fa-eye text-4xl text-white/30"></i>
                                            </div>
                                            <h3 className="text-white text-xl font-semibold mb-2">No Preview Yet</h3>
                                            <p className="text-white/50 text-sm">Start a conversation to generate your website</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'assets' && (
                            <div className="h-full bg-slate-950/50 p-6 overflow-auto">
                                <div className="space-y-8">
                                    {/* Images Section */}
                                    <div>
                                        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                                            <i className="fa-solid fa-image text-blue-400"></i>
                                            Images
                                        </h3>
                                        <div className="grid grid-cols-4 gap-4">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center group hover:border-white/30 transition cursor-pointer">
                                                    <i className="fa-solid fa-image text-white/30 text-2xl group-hover:scale-110 transition"></i>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Colors Section */}
                                    <div>
                                        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                                            <i className="fa-solid fa-palette text-purple-400"></i>
                                            Color Palette
                                        </h3>
                                        <div className="grid grid-cols-6 gap-3">
                                            {['#1e293b', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'].map((color, i) => (
                                                <div key={i} className="group cursor-pointer">
                                                    <div
                                                        className="aspect-square rounded-lg border-2 border-white/20 group-hover:border-white/50 transition group-hover:scale-110"
                                                        style={{ backgroundColor: color }}
                                                    ></div>
                                                    <p className="text-white/60 text-xs text-center mt-2 font-mono">{color}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Fonts Section */}
                                    <div>
                                        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                                            <i className="fa-solid fa-font text-green-400"></i>
                                            Typography
                                        </h3>
                                        <div className="space-y-3">
                                            {['Inter', 'Roboto', 'Poppins'].map((font, i) => (
                                                <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition cursor-pointer">
                                                    <p className="text-white text-sm font-semibold mb-1">{font}</p>
                                                    <p className="text-white/60 text-xs">
                                                        The quick brown fox jumps over the lazy dog
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Videos Section */}
                                    <div>
                                        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                                            <i className="fa-solid fa-video text-red-400"></i>
                                            Videos
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="aspect-video rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-white/10 flex items-center justify-center group hover:border-white/30 transition cursor-pointer">
                                                    <i className="fa-solid fa-play text-white/30 text-2xl group-hover:scale-110 transition"></i>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
