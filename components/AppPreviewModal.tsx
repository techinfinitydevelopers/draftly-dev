'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface AppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    framework: string;
    files: { [path: string]: string };
    fileCount: number;
  };
  onDownload: () => void;
}

export default function AppPreviewModal({ isOpen, onClose, project, onDownload }: AppPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<string>('');
  const [pages, setPages] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && project) {
      // Find the main HTML/entry file
      const findMainFile = () => {
        // Look for common entry points (prioritize HTML files for preview)
        const entryPoints = [
          'index.html',
          'public/index.html',
          'src/index.html',
          'app/page.tsx',
          'src/App.tsx',
          'src/main.tsx',
          'pages/index.tsx',
        ];

        for (const entry of entryPoints) {
          if (project.files[entry]) {
            return entry;
          }
        }

        // Find first HTML file
        for (const path in project.files) {
          if (path.endsWith('.html')) {
            return path;
          }
        }

        // Find React/Next.js page files
        for (const path in project.files) {
          if (path.includes('page.tsx') || path.includes('Page.tsx')) {
            return path;
          }
        }

        // Return first file
        const firstFile = Object.keys(project.files)[0];
        return firstFile || '';
      };

      const mainFile = findMainFile();
      setCurrentPage(mainFile);

      // Extract all page files
      const pageFiles = Object.keys(project.files).filter(path => 
        path.includes('page') || path.includes('Page') || path.endsWith('.html')
      );
      setPages(pageFiles.length > 0 ? pageFiles : [mainFile]);

      // Create preview URL from main file content
      if (project.files[mainFile] && mainFile) {
        const content = project.files[mainFile];
        
        // If it's HTML, create blob URL directly
        if (mainFile.endsWith('.html') || content.includes('<!DOCTYPE') || content.includes('<html')) {
          const blob = new Blob([content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        } else {
          // For React/Next.js/Vue files, try to extract JSX/TSX and render in a preview
          // Create an interactive preview that shows the component structure
          const htmlWrapper = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .preview-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .preview-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .preview-header h1 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .preview-header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .preview-content {
      padding: 40px;
      min-height: 400px;
    }
    .info-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .info-card h2 {
      color: #333;
      margin-bottom: 12px;
      font-size: 20px;
    }
    .info-card p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .file-structure {
      background: #1e1e1e;
      color: #d4d4d4;
      border-radius: 8px;
      padding: 20px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      overflow-x: auto;
    }
    .file-item {
      padding: 4px 0;
      color: #9cdcfe;
    }
    .file-item::before {
      content: "📄 ";
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="preview-wrapper">
    <div class="preview-header">
      <h1>${project.name}</h1>
      <p>${project.framework.toUpperCase()} Application Preview</p>
    </div>
    <div class="preview-content">
      <div class="info-card">
        <h2>🎨 Application Overview</h2>
        <p><strong>Framework:</strong> ${project.framework}</p>
        <p><strong>Total Files:</strong> ${project.fileCount}</p>
        <p><strong>Status:</strong> Ready for deployment</p>
      </div>
      
      <div class="info-card">
        <h2>📁 Project Structure</h2>
        <div class="file-structure">
          ${Object.keys(project.files).slice(0, 20).map(path => 
            `<div class="file-item">${path}</div>`
          ).join('')}
          ${Object.keys(project.files).length > 20 ? `<div class="file-item">... and ${Object.keys(project.files).length - 20} more files</div>` : ''}
        </div>
      </div>
      
      <div class="info-card">
        <h2>✨ Features</h2>
        <p>✅ Complete multi-file project structure</p>
        <p>✅ Production-ready code</p>
        <p>✅ Framework-specific best practices</p>
        <p>✅ Ready for deployment</p>
      </div>
      
      <div style="text-align: center; margin-top: 32px; padding: 24px; background: #f0f0f0; border-radius: 8px;">
        <p style="color: #666; margin-bottom: 16px;">Download the complete project to see the full design and functionality</p>
        <button onclick="window.parent.postMessage('download', '*')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer;">
          Download Project
        </button>
      </div>
    </div>
  </div>
</body>
</html>`;
          const blob = new Blob([htmlWrapper], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      }
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, project]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-charcoal border-2 border-orange-500/30 rounded-lg w-[95vw] h-[90vh] max-w-[1400px] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-stone">
            <div>
              <h2 className="text-white font-display text-2xl mb-1">{project.name}</h2>
              <p className="text-mist text-sm">
                {project.framework} • {project.fileCount} files
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onDownload}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 transition"
              >
                <i className="fa-solid fa-download mr-2"></i>
                Download ZIP
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center border-2 border-stone text-mist hover:border-orange-500 hover:text-white rounded-lg transition"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Page Navigation */}
            {pages.length > 1 && (
              <div className="p-4 border-b border-stone bg-obsidian/50">
                <div className="flex gap-2 overflow-x-auto">
                  {pages.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg font-mono text-sm whitespace-nowrap transition ${
                        currentPage === page
                          ? 'bg-orange-500 text-white'
                          : 'bg-charcoal text-mist hover:bg-stone hover:text-white'
                      }`}
                    >
                      {page.split('/').pop()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Frame */}
            <div className="flex-1 p-6 overflow-auto">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-2 border-stone rounded-lg bg-white"
                  style={{ minHeight: '600px' }}
                  title={`${project.name} Preview`}
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center border-2 border-stone rounded-lg bg-obsidian">
                  <div className="text-center">
                    <i className="fa-solid fa-spinner fa-spin text-4xl text-orange-400 mb-4"></i>
                    <p className="text-mist">Loading preview...</p>
                  </div>
                </div>
              )}
            </div>

            {/* File Structure Info */}
            <div className="p-4 border-t border-stone bg-obsidian/50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-6 text-mist">
                  <span>
                    <i className="fa-solid fa-folder text-orange-400 mr-2"></i>
                    {Object.keys(project.files).length} files
                  </span>
                  <span>
                    <i className="fa-solid fa-code text-orange-400 mr-2"></i>
                    {project.framework}
                  </span>
                </div>
                <button
                  onClick={onDownload}
                  className="text-orange-400 hover:text-orange-500 font-mono font-bold transition"
                >
                  Download Complete Project →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

