'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import Link from 'next/link';
import { getLocalProjects, deleteLocalProject, exportProjects, LocalProject } from '@/lib/local-projects';
import { devError } from '@/lib/client-log';

export default function Projects() {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    try {
      const localProjects = getLocalProjects();
      setProjects(localProjects);
    } catch (error) {
      devError('Error loading projects', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteLocalProject(id);
      loadProjects();
    }
  };

  const downloadProject = (code: string, projectId: string) => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `draftly-${projectId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="font-display text-5xl text-white mb-4">Your Projects</h1>
              <p className="text-mist">All your generated interfaces saved locally on this device</p>
            </div>
            {projects.length > 0 && (
              <button
                onClick={exportProjects}
                className="px-4 py-2 border border-stone text-mist hover:text-white hover:border-white transition-colors text-sm font-mono"
              >
                <i className="fa-solid fa-download mr-2"></i>
                Export All
              </button>
            )}
          </motion.div>

          {loading ? (
            <div className="text-center py-20">
              <i className="fa-solid fa-spinner fa-spin text-4xl text-mist"></i>
              <p className="text-mist mt-4 font-mono text-sm">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-stone p-12 text-center"
            >
              <i className="fa-solid fa-folder-open text-6xl text-stone mb-6"></i>
              <h2 className="font-display text-2xl text-white mb-4">No projects yet</h2>
              <p className="text-mist mb-8">Start creating your first interface</p>
              <Link
                href="/dashboard"
                className="inline-block btn-primary px-6 py-3 border border-white text-white font-medium"
              >
                Create Project
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border border-stone bg-charcoal hover:border-mist transition-colors group"
                >
                  {/* Preview Thumbnail */}
                  <div className="aspect-video bg-graphite border-b border-stone relative overflow-hidden">
                    <iframe
                      srcDoc={project.code}
                      className="w-full h-full pointer-events-none scale-50 origin-top-left"
                      style={{ width: '200%', height: '200%' }}
                      title={`Preview ${project.id}`}
                      sandbox="allow-scripts allow-same-origin"
                    />
                    <div className="absolute inset-0 bg-obsidian/0 group-hover:bg-obsidian/80 transition-colors flex items-center justify-center gap-2">
                      <button
                        onClick={() => downloadProject(project.code, project.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 border border-white text-white text-sm font-mono hover:bg-white hover:text-black"
                      >
                        <i className="fa-solid fa-download mr-2"></i>
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 border border-red-500 text-red-500 text-sm font-mono hover:bg-red-500 hover:text-white"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="p-6">
                    <p className="text-white font-mono text-sm mb-2 line-clamp-2">
                      {project.prompt}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      {project.theme && (
                        <span className="text-xs font-mono text-mist border border-stone px-2 py-1">
                          {project.theme}
                        </span>
                      )}
                      {project.colorScheme && (
                        <span className="text-xs font-mono text-mist border border-stone px-2 py-1">
                          {project.colorScheme}
                        </span>
                      )}
                    </div>
                    <p className="text-mist text-xs font-mono">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Local Storage Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 p-6 border border-stone/50 bg-charcoal/30 rounded-lg"
          >
            <div className="flex items-start gap-4">
              <i className="fa-solid fa-hard-drive text-2xl text-orange-400"></i>
              <div>
                <h3 className="text-white font-semibold mb-2">Projects Stored Locally</h3>
                <p className="text-mist text-sm">
                  Your projects are saved in your browser's local storage. They will persist across sessions 
                  but are specific to this browser and device. Use "Export All" to backup your projects.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-stone bg-obsidian/80 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
          <div>
            <span className="font-display font-bold text-2xl tracking-tight text-white block mb-2">
              DRAFTLY
            </span>
            <p className="text-xs text-ash font-mono">© 2025 DRAFTLY INC. SYSTEM OPERATIONAL.</p>
          </div>
          <div className="flex gap-6">
            <a href="https://x.com/Piyush_Sxt" target="_blank" rel="noopener noreferrer" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-x-twitter"></i>
            </a>
            <a href="https://www.instagram.com/piyush.glitch" target="_blank" rel="noopener noreferrer" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="https://www.linkedin.com/in/piyush-singh-023507359" target="_blank" rel="noopener noreferrer" className="text-ash hover:text-white transition-colors">
              <i className="fa-brands fa-linkedin"></i>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
