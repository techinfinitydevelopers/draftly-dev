'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { devError } from '@/lib/client-log';

export default function Settings() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationsSaved, setIntegrationsSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const load = async () => {
      if (!db || !user) return;
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const d = userDoc.data();
        setApiKey(d.customApiKey || '');
        setGithubToken(d.githubAccessToken ? '••••••••••••' : '');
        setSupabaseUrl(d.supabaseUrl || '');
        setSupabaseAnonKey(d.supabaseAnonKey ? '••••••••••••' : '');
      }
    };
    load();
  }, [user, router]);

  const handleSaveApiKey = async () => {
    if (!user || !db) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        customApiKey: apiKey.trim() || null,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      devError('Failed to save API key', error);
      alert('Failed to save API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegrations = async () => {
    if (!user || !db) return;
    setIntegrationsLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      if (githubToken && !githubToken.startsWith('••••')) updates.githubAccessToken = githubToken.trim();
      if (supabaseUrl) updates.supabaseUrl = supabaseUrl.trim();
      if (supabaseAnonKey && !supabaseAnonKey.startsWith('••••')) updates.supabaseAnonKey = supabaseAnonKey.trim();
      await setDoc(userRef, updates, { merge: true });
      setIntegrationsSaved(true);
      if (githubToken && !githubToken.startsWith('••••')) setGithubToken('••••••••••••');
      if (supabaseAnonKey && !supabaseAnonKey.startsWith('••••')) setSupabaseAnonKey('••••••••••••');
      setTimeout(() => setIntegrationsSaved(false), 3000);
    } catch (error) {
      devError('Failed to save integrations', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIntegrationsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="font-display text-5xl text-white mb-2">Settings</h1>
            <p className="text-mist">Manage your account preferences</p>
          </motion.div>

          {/* Custom API Key Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-stone bg-charcoal p-8 mb-6"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl text-white mb-2 flex items-center gap-2">
                  Custom Gemini API Key
                  {isPro && (
                    <span className="text-sm bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full font-bold">
                      <i className="fa-solid fa-crown mr-1"></i>PRO
                    </span>
                  )}
                </h2>
                <p className="text-mist text-sm">
                  {isPro 
                    ? 'Use your own Gemini API key for unlimited generations without consuming our quota.'
                    : 'Upgrade to Pro to use your own Gemini API key for truly unlimited generations.'}
                </p>
              </div>
            </div>

            {isPro ? (
              <>
                <div className="mb-4">
                  <label className="block text-white font-mono text-sm mb-2">
                    Your Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-graphite border border-stone text-white px-4 py-3 rounded-lg focus:outline-none focus:border-orange-500 transition font-mono text-sm"
                  />
                  <p className="text-mist text-xs mt-2">
                    Get your free API key from{' '}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>

                <button
                  onClick={handleSaveApiKey}
                  disabled={loading}
                  className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <i className="fa-solid fa-check mr-2"></i>
                      Saved!
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-save mr-2"></i>
                      Save API Key
                    </>
                  )}
                </button>

                {apiKey && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm">
                      <i className="fa-solid fa-check-circle mr-2"></i>
                      Your custom API key is active. All generations will use your key.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <i className="fa-solid fa-lock text-4xl text-orange-400 mb-3"></i>
                <p className="text-white font-bold mb-2">Pro Feature</p>
                <p className="text-mist text-sm mb-4">
                  Upgrade to Pro to use your own API key and get truly unlimited generations
                </p>
                <button
                  onClick={() => router.push('/pricing')}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-500 hover:to-orange-600 transition"
                >
                  <i className="fa-solid fa-crown mr-2"></i>
                  Upgrade to Pro
                </button>
              </div>
            )}
          </motion.div>

          {/* Integrations — GitHub, Supabase, Firebase, Vercel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="border border-stone bg-charcoal p-8 mb-6"
          >
            <h2 className="font-display text-2xl text-white mb-2 flex items-center gap-2">
              <i className="fa-solid fa-plug"></i>
              Integrations
            </h2>
            <p className="text-mist text-sm mb-6">
              Connect your own services. Generated projects will include .env.example — replace placeholders with your keys when you deploy. Your keys are stored securely and used when pushing to GitHub or downloading.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-white font-mono text-sm mb-2">GitHub Personal Access Token</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full bg-graphite border border-stone text-white px-4 py-3 rounded-lg focus:outline-none focus:border-orange-500 transition font-mono text-sm"
                />
                <p className="text-mist text-xs mt-1">
                  <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Create token</a> with <code className="bg-stone px-1 rounded">repo</code> scope. Required for Push to GitHub.
                </p>
              </div>
              <div>
                <label className="block text-white font-mono text-sm mb-2">Supabase Project URL</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxxx.supabase.co"
                  className="w-full bg-graphite border border-stone text-white px-4 py-3 rounded-lg focus:outline-none focus:border-orange-500 transition font-mono text-sm"
                />
                <p className="text-mist text-xs mt-1">From Supabase Dashboard → Project Settings → API</p>
              </div>
              <div>
                <label className="block text-white font-mono text-sm mb-2">Supabase Anon Key</label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="w-full bg-graphite border border-stone text-white px-4 py-3 rounded-lg focus:outline-none focus:border-orange-500 transition font-mono text-sm"
                />
                <p className="text-mist text-xs mt-1">Public anon key (safe for frontend). Used in generated .env.example</p>
              </div>
            </div>

            <button
              onClick={handleSaveIntegrations}
              disabled={integrationsLoading}
              className="mt-4 px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {integrationsLoading ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Saving...</> : integrationsSaved ? <><i className="fa-solid fa-check mr-2"></i>Saved!</> : <><i className="fa-solid fa-save mr-2"></i>Save Integrations</>}
            </button>

            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">
                <i className="fa-solid fa-info-circle mr-2"></i>
                Generated projects include <code className="bg-stone/50 px-1 rounded">.env.example</code> with all variables. Copy to <code className="bg-stone/50 px-1 rounded">.env</code> and add your keys when deploying. Your connected keys can be injected into downloads.
              </p>
            </div>
          </motion.div>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-stone bg-charcoal/50 p-6"
          >
            <h3 className="text-white font-display text-lg mb-3">
              <i className="fa-solid fa-info-circle mr-2 text-orange-500"></i>
              Why use your own API key?
            </h3>
            <ul className="space-y-2 text-mist text-sm">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-orange-500 mt-1"></i>
                <span><strong>Truly Unlimited:</strong> No monthly generation limits</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-orange-500 mt-1"></i>
                <span><strong>Open Source:</strong> Full control over your API usage</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-orange-500 mt-1"></i>
                <span><strong>Privacy:</strong> Your generations use your own quota</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-orange-500 mt-1"></i>
                <span><strong>Free Tier:</strong> Google provides generous free API limits</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
