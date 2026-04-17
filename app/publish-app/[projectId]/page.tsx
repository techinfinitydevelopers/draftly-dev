'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';

export default function PublishAppPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<{ projectName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preparing, setPreparing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [buildRunId, setBuildRunId] = useState<number | null>(null);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [androidUrl, setAndroidUrl] = useState<string | null>(null);
  const [iosUrl, setIosUrl] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!user?.uid || !projectId) return;
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      if (!db) return;
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        setError('User not found');
        return;
      }
      const data = userDoc.data();
      const projects = data?.generationTracking?.projects || {};
      const p = projects[projectId];
      if (!p) {
        setError('Project not found');
        return;
      }
      setProject(p);
    } catch (e: any) {
      setError(e?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, projectId]);

  useEffect(() => {
    if (!authLoading && user && projectId) loadProject();
  }, [authLoading, user, projectId, loadProject]);

  useEffect(() => {
    if (!buildRunId || !user?.uid || buildStatus === 'completed') return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/publish-app/build-status?runId=${buildRunId}&userId=${user.uid}&projectId=${projectId}`
        );
        const data = await res.json();
        if (data.status === 'completed') {
          setBuildStatus('completed');
          if (data.androidUrl) setAndroidUrl(data.androidUrl);
          if (data.iosUrl) setIosUrl(data.iosUrl);
          if (data.error) setBuildError(data.error);
        } else {
          setBuildStatus(data.status || 'in_progress');
        }
      } catch {
        setBuildError('Failed to check build status');
      }
    }, 8000);
    return () => clearInterval(t);
  }, [buildRunId, user?.uid, projectId, buildStatus]);

  const handleDownloadPrepared = async () => {
    if (!user?.uid || !projectId) return;
    setPreparing(true);
    setError(null);
    try {
      const res = await fetch('/api/publish-app/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId: user.uid }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to prepare');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(project?.projectName || 'app').replace(/\s+/g, '-')}-publish-app.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Failed to download');
    } finally {
      setPreparing(false);
    }
  };

  const handleTriggerBuild = async () => {
    if (!user?.uid || !projectId) return;
    setTriggering(true);
    setBuildError(null);
    setAndroidUrl(null);
    setIosUrl(null);
    setBuildStatus(null);
    try {
      const res = await fetch('/api/publish-app/trigger-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId: user.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to start build');
      setBuildRunId(data.runId);
      setBuildStatus(data.status || 'queued');
      if (data.message) setBuildError(null);
    } catch (e: any) {
      setBuildError(e?.message || 'Failed to trigger build');
    } finally {
      setTriggering(false);
    }
  };

  const handleDownloadWebsiteZip = async () => {
    if (!user?.uid || !projectId) return;
    try {
      const res = await fetch('/api/generate-full-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          projectId,
          outputFormat: 'zip',
          exportForMobile: true,
          prompt: project?.projectName,
          framework: 'nextjs',
          projectName: project?.projectName || 'app',
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(project?.projectName || 'app').replace(/\s+/g, '-')}-mobile.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Failed to download');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-obsidian relative">
        <GrungeBackground />
        <div className="relative z-10">
          <Header />
        </div>
        <div className="pt-32 px-6 flex items-center justify-center relative z-10">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-mist"></i>
          <p className="text-white ml-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    void signInWithGoogle();
    return null;
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-obsidian relative">
        <GrungeBackground />
        <div className="relative z-10">
          <Header />
        </div>
        <section className="pt-32 px-6 text-center relative z-10">
          <h1 className="font-display text-4xl text-white mb-4">
            {error || 'Project not found'}
          </h1>
          <Link
            href="/projects-dashboard"
            className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold rounded-lg"
          >
            Back to projects
          </Link>
        </section>
      </div>
    );
  }

  const projectName = project.projectName || 'App';

  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-28 pb-24 px-6 relative z-10">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl text-white mb-3">
              Publish as App
            </h1>
            <p className="text-mist text-lg">
              Get <span className="text-white font-medium">{projectName}</span> on the App Store and Play Store.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Download Website ZIP */}
            <div className="bg-charcoal/80 border-2 border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-file-zipper text-orange-400"></i>
                </span>
                <h2 className="text-white font-display text-xl">Download Website</h2>
              </div>
              <p className="text-mist text-sm mb-4">
                Full project ZIP with Capacitor config. Build locally or use the cloud build below.
              </p>
              <button
                onClick={handleDownloadWebsiteZip}
                className="w-full px-4 py-3 bg-obsidian border-2 border-orange-500/50 text-orange-400 font-mono rounded-lg hover:bg-orange-500/10 transition"
              >
                <i className="fa-solid fa-download mr-2"></i>
                Download ZIP
              </button>
            </div>

            {/* Prepared project (same as above but from prepare API) */}
            <div className="bg-charcoal/80 border-2 border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-mobile-screen text-orange-400"></i>
                </span>
                <h2 className="text-white font-display text-xl">Prepared for stores</h2>
              </div>
              <p className="text-mist text-sm mb-4">
                Capacitor-ready project. Unzip, run <code className="text-orange-400">npm run build</code> and <code className="text-orange-400">cap add android/ios</code>.
              </p>
              <button
                onClick={handleDownloadPrepared}
                disabled={preparing}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition"
              >
                {preparing ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-download mr-2"></i>}
                Download for App Store / Play Store
              </button>
            </div>
          </div>

          {/* Build in the cloud */}
          <div className="mt-10 bg-charcoal/80 border-2 border-orange-500/30 rounded-xl p-6">
            <h2 className="text-white font-display text-xl mb-2 flex items-center gap-2">
              <i className="fa-solid fa-cloud text-orange-400"></i>
              Build in the cloud
            </h2>
            <p className="text-mist text-sm mb-4">
              Start a build to get an Android .aab (and optionally iOS .ipa). Requires GitHub repo with the build workflow configured.
            </p>
            {buildError && (
              <p className="text-amber-400 text-sm mb-3">{buildError}</p>
            )}
            {!buildRunId ? (
              <button
                onClick={handleTriggerBuild}
                disabled={triggering}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition"
              >
                {triggering ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                Build Android &amp; iOS
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-mist text-sm">
                  Status: <span className="text-white font-medium">{buildStatus || 'queued'}</span>
                  {buildStatus !== 'completed' && (
                    <span className="ml-2 text-mist">(check back in 1–2 minutes)</span>
                  )}
                </p>
                {androidUrl && (
                  <a
                    href={androidUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30"
                  >
                    <i className="fa-solid fa-download"></i>
                    Download Android (.aab)
                  </a>
                )}
                {iosUrl && (
                  <a
                    href={iosUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 ml-2"
                  >
                    <i className="fa-solid fa-download"></i>
                    Download iOS (.ipa)
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={`/project/${projectId}`}
              className="text-orange-400 hover:text-orange-300 font-mono text-sm"
            >
              ← Back to project
            </Link>
            <Link
              href="/publish-mobile"
              className="text-mist hover:text-white text-sm"
            >
              Publish guide →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
