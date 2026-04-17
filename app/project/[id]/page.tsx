'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { generatePreviewHTML } from '@/lib/preview-generator';
import { devError } from '@/lib/client-log';

export default function ProjectView() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [iterating, setIterating] = useState(false);
  const [iterationPrompt, setIterationPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [exportingMobile, setExportingMobile] = useState(false);

  useEffect(() => {
    if (!authLoading && user && projectId) {
      loadProject();
    }

    // Cleanup preview URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [user, authLoading, projectId, previewUrl]);

  const loadProject = async () => {
    if (!user || !db) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const generationTracking = userData?.generationTracking || { projects: {} };
        const projectData = generationTracking.projects[projectId];

        if (projectData) {
          setProject(projectData);
          
          // Generate preview URL
          try {
            if (projectData.files && Object.keys(projectData.files).length > 0) {
              const previewHTML = generatePreviewHTML({
                files: projectData.files,
                framework: projectData.framework || 'nextjs',
                projectName: projectData.projectName || 'Project',
              });
              const blob = new Blob([previewHTML], { type: 'text/html' });
              setPreviewUrl(URL.createObjectURL(blob));
            }
          } catch (error) {
            devError('Error generating preview', error);
          }
        } else {
          setError('Project not found');
        }
      }
    } catch (error) {
      devError('Error loading project', error);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleIterate = async () => {
    if (!iterationPrompt.trim() || !user) return;

    setIterating(true);
    setError(null);

    try {
      const response = await fetch('/api/iterate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: user.uid,
          prompt: iterationPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to iterate project');
      }

      const data = await response.json();
      setIterationPrompt('');
      
      // Cleanup old preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      
      await loadProject(); // Reload project to show updates

      alert(`Project updated! ${data.iterationsRemaining} iterations remaining.`);
    } catch (err: any) {
      setError(err.message || 'Failed to iterate project');
    } finally {
      setIterating(false);
    }
  };

  const handleExport = async () => {
    if (!project) return;

    try {
      const response = await fetch('/api/generate-full-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: project.projectName,
          framework: project.framework,
          projectName: project.projectName,
          userId: user?.uid,
          outputFormat: 'zip',
          projectId, // Use existing project
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export project');
    }
  };

  const handleExportMobile = async () => {
    if (!project) return;
    setExportingMobile(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-full-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: project.projectName,
          framework: project.framework,
          projectName: project.projectName,
          userId: user?.uid,
          outputFormat: 'zip',
          projectId,
          exportForMobile: true,
        }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.projectName}-mobile.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export mobile package');
    } finally {
      setExportingMobile(false);
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
          <p className="text-white ml-4">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-obsidian relative">
        <GrungeBackground />
        <div className="relative z-10">
          <Header />
        </div>
        <div className="pt-32 px-6 text-center relative z-10">
          <h1 className="font-display text-4xl text-white mb-4">Project Not Found</h1>
          <button
            onClick={() => router.push('/projects-dashboard')}
            className="mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-orange-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const fileCount = Object.keys(project.files || {}).length;
  const iterationCount = project.iterationCount || 0;
  const iterationsRemaining = 5 - iterationCount;

  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-display text-4xl text-white mb-2">{project.projectName}</h1>
                <div className="flex items-center gap-4 text-mist text-sm">
                  <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/50 rounded text-orange-400 font-mono">
                    {project.framework}
                  </span>
                  <span>{fileCount} files</span>
                  <span>{iterationCount} iterations</span>
                  {iterationsRemaining > 0 && (
                    <span className="text-green-400">{iterationsRemaining} remaining</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`/publish-app/${projectId}`}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 transition shadow-lg"
                >
                  <i className="fa-solid fa-rocket mr-2"></i>
                  Publish as App
                </a>
                <button
                  onClick={handleExport}
                  className="px-6 py-3 bg-charcoal border-2 border-orange-500/50 text-orange-400 font-mono font-bold rounded-lg hover:bg-orange-500/10 transition"
                >
                  <i className="fa-solid fa-download mr-2"></i>
                  Export ZIP
                </button>
                <button
                  onClick={handleExportMobile}
                  disabled={exportingMobile}
                  className="px-5 py-3 border-2 border-orange-500/50 text-orange-400 font-mono rounded-lg hover:bg-orange-500/10 transition disabled:opacity-50"
                >
                  {exportingMobile ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-mobile-screen mr-2"></i>}
                  Download for stores
                </button>
                <a
                  href="/publish-mobile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 text-mist hover:text-orange-400 text-sm font-mono"
                >
                  Guide →
                </a>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500/50 rounded-lg">
              <p className="text-red-400 font-mono text-sm">{error}</p>
            </div>
          )}

          {/* Live Preview */}
          {previewUrl && (
            <div className="mb-8 bg-charcoal/80 border-2 border-orange-500/30 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-stone bg-obsidian/50">
                <h2 className="text-white font-display text-xl">Live Preview</h2>
                <p className="text-mist text-sm mt-1">Preview of your generated application</p>
              </div>
              <div className="relative" style={{ height: '600px' }}>
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={`Preview ${project.projectName}`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            </div>
          )}

          {/* Iteration Section */}
          {iterationsRemaining > 0 ? (
            <div className="mb-8 bg-charcoal/80 border-2 border-orange-500/30 rounded-lg p-6">
              <h2 className="text-white font-display text-xl mb-4">Iterate on Project</h2>
              <p className="text-mist text-sm mb-4">
                Modify your project without consuming a new generation. {iterationsRemaining} iterations remaining.
              </p>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={iterationPrompt}
                  onChange={(e) => setIterationPrompt(e.target.value)}
                  placeholder="Describe what you want to change..."
                  className="flex-1 bg-obsidian border-2 border-orange-500/30 rounded-lg px-4 py-3 text-white font-mono focus:border-orange-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleIterate()}
                />
                <button
                  onClick={handleIterate}
                  disabled={iterating || !iterationPrompt.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {iterating ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    'Apply Changes'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-8 p-4 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-lg">
              <p className="text-yellow-400 font-mono text-sm">
                This project has reached the maximum of 5 iterations. Create a new project to continue.
              </p>
            </div>
          )}

          {/* Files List */}
          <div className="bg-charcoal/80 border-2 border-orange-500/30 rounded-lg p-6">
            <h2 className="text-white font-display text-xl mb-4">Project Files</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.keys(project.files || {}).map((filePath) => (
                <div
                  key={filePath}
                  className="flex items-center gap-3 p-3 bg-obsidian rounded border border-stone hover:border-orange-500/50 transition"
                >
                  <i className="fa-solid fa-file text-orange-400"></i>
                  <span className="text-white font-mono text-sm flex-1">{filePath}</span>
                  <span className="text-mist/60 text-xs">
                    {project.files[filePath].length} chars
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Iteration History */}
          {project.iterationHistory && project.iterationHistory.length > 0 && (
            <div className="mt-8 bg-charcoal/80 border-2 border-orange-500/30 rounded-lg p-6">
              <h2 className="text-white font-display text-xl mb-4">Iteration History</h2>
              <div className="space-y-4">
                {project.iterationHistory.map((iteration: any, idx: number) => (
                  <div key={idx} className="bg-obsidian rounded p-4 border border-stone">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-mono text-sm font-bold">
                        Iteration {idx + 1}
                      </span>
                      <span className="text-mist/60 text-xs">
                        {new Date(iteration.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-mist text-sm mb-2">{iteration.description}</p>
                    <div className="text-mist/60 text-xs">
                      Modified: {Object.keys(iteration.changes.modified || {}).length} files
                      {Object.keys(iteration.changes.added || {}).length > 0 && (
                        <span>, Added: {Object.keys(iteration.changes.added || {}).length} files</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

