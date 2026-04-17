'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { generatePreviewHTML } from '@/lib/preview-generator';
import { devError } from '@/lib/client-log';

interface ProjectMetadata {
  id: string;
  name: string;
  framework: string;
  createdAt: string;
  lastModified: string;
  iterationCount: number;
  fileCount: number;
  status: 'active' | 'archived';
  files?: { [path: string]: string };
  previewUrl?: string;
}

export default function ProjectsDashboard() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { subscription, fullAppsRemaining, fullAppsLimit, isPro, isOwner } = useSubscription();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFramework, setFilterFramework] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      loadProjects();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      projects.forEach(project => {
        if (project.previewUrl) {
          URL.revokeObjectURL(project.previewUrl);
        }
      });
    };
  }, [projects]);

  const loadProjects = async () => {
    if (!user || !db) return;

    try {
      setLoading(true);
      
      // Load from Firebase user document generationTracking
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const generationTracking = userData?.generationTracking || { projects: {} };
        
        const projectsList: ProjectMetadata[] = await Promise.all(
          Object.values(generationTracking.projects).map(async (project: any) => {
            // Generate preview HTML for each project
            let previewUrl = '';
            try {
              if (project.files && Object.keys(project.files).length > 0) {
                const previewHTML = generatePreviewHTML({
                  files: project.files,
                  framework: project.framework || 'nextjs',
                  projectName: project.projectName || 'Project',
                });
                const blob = new Blob([previewHTML], { type: 'text/html' });
                previewUrl = URL.createObjectURL(blob);
              }
            } catch (error) {
              devError('Error generating preview for project', error);
            }

            return {
              id: project.projectId,
              name: project.projectName,
              framework: project.framework,
              createdAt: project.createdAt,
              lastModified: project.lastModified,
              iterationCount: project.iterationCount || 0,
              fileCount: Object.keys(project.files || {}).length,
              status: project.status || 'active',
              files: project.files,
              previewUrl,
            };
          })
        );

        // Sort by last modified
        projectsList.sort((a, b) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );

        setProjects(projectsList);
      }
    } catch (error) {
      devError('Error loading projects', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.framework.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFramework = filterFramework === 'all' || project.framework === filterFramework;
    return matchesSearch && matchesFramework && project.status === 'active';
  });

  const handleOpenProject = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  const handleExportProject = async (projectId: string) => {
    // Navigate to export page or trigger download
    router.push(`/project/${projectId}/export`);
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
          <p className="text-white ml-4">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian relative">
        <GrungeBackground />
        <div className="relative z-10">
          <Header />
        </div>
        <section className="pt-32 pb-24 px-6 relative z-10">
          <div className="max-w-[800px] mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-folder text-white text-3xl"></i>
              </div>
              <h1 className="font-display text-5xl text-white mb-4">Projects Dashboard</h1>
              <p className="text-mist text-lg mb-8">
                Manage, iterate, and export all your generated full-stack applications in one place. Track your project history and continue building.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-charcoal border border-white/20 rounded-2xl p-8 mb-8"
            >
              <h2 className="font-display text-2xl text-white mb-4">Sign in to Access Your Projects</h2>
              <p className="text-mist mb-6">
                Sign in to view, manage, and continue working on all your generated projects.
              </p>
              <button
                onClick={() => { void signInWithGoogle(); }}
                className="w-full py-4 bg-white text-black rounded-lg font-display text-lg hover:bg-white/90 transition-all hover:scale-105 flex items-center justify-center gap-3"
              >
                <i className="fa-brands fa-google text-xl"></i>
                <span>Sign in with Google</span>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left"
            >
              <div className="bg-charcoal/50 border border-white/10 rounded-lg p-6">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                  <i className="fa-solid fa-folder-open text-orange-400 text-xl"></i>
                </div>
                <h3 className="text-white font-display text-lg mb-2">Project Management</h3>
                <p className="text-mist text-sm">View and organize all your generated projects</p>
              </div>
              <div className="bg-charcoal/50 border border-white/10 rounded-lg p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <i className="fa-solid fa-code-branch text-purple-400 text-xl"></i>
                </div>
                <h3 className="text-white font-display text-lg mb-2">Iterate & Improve</h3>
                <p className="text-mist text-sm">Continue building and refining your applications</p>
              </div>
              <div className="bg-charcoal/50 border border-white/10 rounded-lg p-6">
                <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                  <i className="fa-solid fa-download text-pink-400 text-xl"></i>
                </div>
                <h3 className="text-white font-display text-lg mb-2">Export & Deploy</h3>
                <p className="text-mist text-sm">Download your projects as ZIP files or push to GitHub</p>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-4xl text-white mb-2">My Projects</h1>
            <p className="text-mist">Manage and iterate on your generated projects</p>
            
            {(isPro || isOwner) && fullAppsLimit > 0 && (
              <div className="mt-4 p-4 bg-charcoal/50 rounded-lg border border-mist/20">
                <p className="text-white text-sm">
                  <strong>Full Apps Remaining:</strong> {isOwner ? 'Unlimited' : `${fullAppsRemaining} / ${fullAppsLimit} this month`}
                </p>
              </div>
            )}
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 flex flex-col md:flex-row gap-4"
          >
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-charcoal border-2 border-orange-500/30 rounded-lg px-4 py-3 text-white font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>
            <select
              value={filterFramework}
              onChange={(e) => setFilterFramework(e.target.value)}
              className="bg-charcoal border-2 border-orange-500/30 rounded-lg px-4 py-3 text-white font-mono focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Frameworks</option>
              <option value="nextjs">Next.js</option>
              <option value="react">React</option>
              <option value="vue">Vue</option>
              <option value="vanilla">Vanilla</option>
            </select>
          </motion.div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <i className="fa-solid fa-folder-open text-6xl text-mist/30 mb-4"></i>
              <p className="text-mist text-lg mb-2">No projects found</p>
              <p className="text-mist/60 text-sm">
                {searchQuery || filterFramework !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Generate your first project to get started'}
              </p>
              {!searchQuery && filterFramework === 'all' && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-orange-700 transition"
                >
                  Generate New Project
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-charcoal/80 border-2 border-orange-500/30 rounded-lg overflow-hidden hover:border-orange-500 transition cursor-pointer group"
                  onClick={() => handleOpenProject(project.id)}
                >
                  {/* Preview Thumbnail */}
                  <div className="aspect-video bg-graphite border-b border-stone relative overflow-hidden">
                    {project.previewUrl ? (
                      <iframe
                        src={project.previewUrl}
                        className="w-full h-full pointer-events-none scale-50 origin-top-left"
                        style={{ width: '200%', height: '200%' }}
                        title={`Preview ${project.name}`}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <i className="fa-solid fa-code text-4xl text-mist/30 mb-2"></i>
                          <p className="text-mist/50 text-xs font-mono">No preview</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-obsidian/0 group-hover:bg-obsidian/80 transition-colors flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 border border-white text-white text-sm font-mono bg-obsidian/90"
                      >
                        <i className="fa-solid fa-eye mr-2"></i>
                        View Preview
                      </button>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-white font-display text-xl mb-1">{project.name}</h3>
                        <span className="inline-block px-2 py-1 bg-orange-500/20 border border-orange-500/50 rounded text-orange-400 font-mono text-xs">
                          {project.framework}
                        </span>
                      </div>
                      <i className="fa-solid fa-chevron-right text-mist/50"></i>
                    </div>

                    <div className="space-y-2 text-sm text-mist/80 mb-4">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-file text-orange-400 text-xs"></i>
                        <span>{project.fileCount} files</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-code-branch text-orange-400 text-xs"></i>
                        <span>{project.iterationCount} iterations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-clock text-orange-400 text-xs"></i>
                        <span>Modified {new Date(project.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-stone">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project.id);
                        }}
                        className="flex-1 min-w-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono text-xs font-bold py-2 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition"
                      >
                        Open
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/publish-app/${project.id}`);
                        }}
                        className="px-4 py-2 border-2 border-orange-500/50 text-orange-400 font-mono text-xs rounded-lg hover:bg-orange-500/10 transition"
                      >
                        <i className="fa-solid fa-mobile-screen mr-1"></i>
                        Publish as App
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportProject(project.id);
                        }}
                        className="px-4 py-2 border-2 border-stone text-mist font-mono text-xs rounded-lg hover:border-orange-400 hover:text-white transition"
                      >
                        Export
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

