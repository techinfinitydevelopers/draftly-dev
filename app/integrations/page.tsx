'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GitHubLogo, SupabaseLogo, FirebaseLogo } from '@/components/IntegrationLogos';
import { INTEGRATION_KITS, type IntegrationKitId, buildEnvExampleFromKitsAndExistingKeys } from '@/lib/integration-kits';

const DEFAULT_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'STRIPE_PUBLISHABLE_KEY',
  'OPENAI_API_KEY',
  'DATABASE_URL',
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'integrations' | 'env'>('integrations');
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [enabledKits, setEnabledKits] = useState<IntegrationKitId[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchStatus = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/integrations/status', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setGithubConnected(data.githubConnected);
      setGithubUsername(data.githubUsername || '');
      setEnabledKits(Array.isArray(data.enabledKits) ? data.enabledKits : []);
      const keys = data.envKeys || [];
      setEnvVars((prev) => {
        const next = Object.fromEntries(keys.map((k: string) => [k, '••••••••']));
        for (const [k, v] of Object.entries(prev)) {
          if (v !== '••••••••' && v !== '') next[k] = v;
        }
        return next;
      });
    }
  };

  const toggleKit = async (kitId: IntegrationKitId) => {
    if (!user) return;
    const next = enabledKits.includes(kitId)
      ? enabledKits.filter((k) => k !== kitId)
      : [...enabledKits, kitId];
    setEnabledKits(next);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/integrations/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabledKits: next }),
      });
      if (!res.ok) throw new Error('Save kits failed');
      // Pre-add required env keys (as empty) so users can paste their own values.
      const required = Object.values(next).flatMap((k) => INTEGRATION_KITS[k]?.requiredEnvKeys || []);
      setEnvVars((prev) => {
        const merged = { ...prev };
        for (const key of required) {
          if (!merged[key]) merged[key] = '';
        }
        return merged;
      });
    } catch {
      // Revert locally on failure
      setEnabledKits(enabledKits);
      alert('Failed to update integration kits');
    }
  };
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state) {
      user.getIdToken().then((token) =>
        fetch('/api/github/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, state }),
        })
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setGithubConnected(true);
            setGithubUsername(data.username || '');
            window.history.replaceState({}, '', '/integrations');
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }
    const load = async () => {
      if (!user) return;
      try {
        await fetchStatus();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, router, searchParams]);

  const handleConnectGitHub = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`/api/github/oauth?userId=${encodeURIComponent(user.uid)}`);
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to get GitHub URL');
    } catch (e) {
      alert('Failed to connect GitHub');
    }
  };

  const handleSaveEnvVars = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(envVars).filter(([, v]) => v !== '••••••••').map(([k, v]) => [k, v])
      );
      const token = await user.getIdToken();
      const res = await fetch('/api/integrations/env-vars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchStatus();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addEnvVar = (key: string) => {
    const k = key.trim().toUpperCase().replace(/\s/g, '_');
    if (k && !envVars[k]) setEnvVars(prev => ({ ...prev, [k]: '' }));
    setNewEnvKey('');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <GrungeBackground />
      <Header />
      <main className="pt-24 pb-24 px-6 relative z-10">
        <div className="max-w-[900px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h1 className="font-display text-4xl font-bold text-white mb-2">Integrations & Infrastructure</h1>
            <p className="text-white/60 text-sm">Connect services, manage environment variables, and deploy your applications.</p>
          </motion.div>

          <div className="flex gap-2 mb-8 border-b border-white/10">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'integrations' ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white/80'}`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveTab('env')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'env' ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white/80'}`}
            >
              Environment Variables
            </button>
          </div>

          {activeTab === 'integrations' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
                <h3 className="font-bold text-white mb-2">Integration Kits (Replit-style scaffolding)</h3>
                <p className="text-sm text-white/50 mb-4">
                  We don’t require direct business access to your accounts. Instead, we scaffold the integration code + required env keys into your generated project.
                  You paste your own API keys/secrets in Environment Variables.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.values(INTEGRATION_KITS) as any[]).map((kit) => {
                    const enabled = enabledKits.includes(kit.id);
                    return (
                      <div key={kit.id} className="border border-white/10 rounded-xl p-4 bg-white/[0.02] flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{kit.name}</p>
                          <p className="text-xs text-white/55 mt-1">{kit.description}</p>
                          <p className="text-[11px] text-white/35 mt-2">
                            Adds {kit.requiredEnvKeys.length} env key{kit.requiredEnvKeys.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleKit(kit.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${
                            enabled
                              ? 'bg-white text-black border-white'
                              : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                          }`}
                        >
                          {enabled ? 'Enabled' : 'Enable'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              {[
                { id: 'github', name: 'GitHub', desc: 'Push code, sync repos, version control', icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z', connected: githubConnected },
                { id: 'supabase', name: 'Supabase', desc: 'Database, auth, storage', icon: 'db', connected: false },
                { id: 'firebase', name: 'Firebase', desc: 'Auth, Firestore, Storage', icon: 'fire', connected: false },
                { id: 'stripe', name: 'Stripe', desc: 'Payments', icon: 'card', connected: false },
              ].map((s) => (
                <div key={s.id} className="border border-white/10 rounded-xl p-6 bg-white/[0.02] flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    {s.id === 'github' ? (
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <GitHubLogo size="lg" />
                      </div>
                    ) : s.id === 'supabase' ? (
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <SupabaseLogo size="lg" />
                      </div>
                    ) : s.id === 'firebase' ? (
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <FirebaseLogo size="lg" />
                      </div>
                    ) : s.icon === 'card' ? (
                      <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d={s.icon} /></svg>
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white">{s.name}</h3>
                      <p className="text-sm text-white/50">{s.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.connected && <span className="text-xs font-bold text-green-400 bg-green-500/20 px-2 py-1 rounded">Connected{s.id === 'github' && githubUsername ? ` @${githubUsername}` : ''}</span>}
                    {s.id === 'github' ? (
                      githubConnected ? (
                        <Link href="/settings" className="text-sm text-white/60 hover:text-white">Manage in Settings</Link>
                      ) : (
                        <button onClick={handleConnectGitHub} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-bold hover:bg-white/90">
                          Connect with OAuth
                        </button>
                      )
                    ) : (
                      <Link href="/settings" className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20">
                        Configure
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'env' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
                <h3 className="font-bold text-white mb-2">Environment Variables / Secrets</h3>
                <p className="text-sm text-white/50 mb-4">These are injected into generated projects. Never commit real keys to git — use .env locally and provider secrets in production.</p>
                <div className="mb-4 p-4 rounded-xl bg-black/30 border border-white/10">
                  <p className="text-xs text-white/70 font-semibold mb-2">Generated `.env.example` preview</p>
                  <pre className="text-[11px] text-white/55 overflow-auto whitespace-pre-wrap">
                    {buildEnvExampleFromKitsAndExistingKeys({ kits: enabledKits, existingEnvKeys: Object.keys(envVars) })}
                  </pre>
                </div>
                <div className="space-y-3">
                  {DEFAULT_ENV_KEYS.map((k) => (
                    <div key={k} className="flex gap-2 items-center">
                      <code className="w-48 text-xs text-white/70 bg-white/5 px-2 py-1.5 rounded flex-shrink-0">{k}</code>
                      <input
                        type="password"
                        value={envVars[k] || ''}
                        onChange={(e) => setEnvVars(prev => ({ ...prev, [k]: e.target.value }))}
                        placeholder="••••••••"
                        className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30"
                      />
                    </div>
                  ))}
                  {Object.entries(envVars)
                    .filter(([k]) => !DEFAULT_ENV_KEYS.includes(k))
                    .map(([k]) => (
                      <div key={k} className="flex gap-2 items-center">
                        <code className="w-48 text-xs text-white/70 bg-white/5 px-2 py-1.5 rounded flex-shrink-0">{k}</code>
                        <input
                          type="password"
                          value={envVars[k] || ''}
                          onChange={(e) => setEnvVars(prev => ({ ...prev, [k]: e.target.value }))}
                          className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
                        />
                        <button onClick={() => setEnvVars(prev => { const n = { ...prev }; delete n[k]; return n; })} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                      </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <input
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addEnvVar(newEnvKey)}
                    placeholder="Add key (e.g. OPENAI_API_KEY)"
                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30"
                  />
                  <button onClick={() => addEnvVar(newEnvKey)} className="px-4 py-2 rounded bg-white/10 text-white text-sm font-semibold hover:bg-white/20">Add</button>
                </div>
                <button
                  onClick={handleSaveEnvVars}
                  disabled={saving}
                  className="mt-6 px-6 py-3 rounded-lg bg-white text-black font-bold hover:bg-white/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Environment Variables'}
                </button>
              </div>
            </motion.div>
          )}

          <div className="mt-10 p-6 rounded-xl border border-violet-500/30 bg-violet-500/10">
            <p className="text-sm text-white/80">
              <strong>Deploy from the builder:</strong> After generating a site, use the Preview overlay to Push to GitHub, Download ZIP, or deploy. Environment variables are included in .env.example — copy to .env and add your keys when deploying to Vercel, Netlify, or your own server.
            </p>
            <Link href="/3d-builder" className="inline-block mt-3 text-violet-300 hover:text-violet-200 font-semibold text-sm">Open 3D Builder →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
