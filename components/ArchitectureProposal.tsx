'use client';

import { motion } from 'framer-motion';
import { ProjectArchitecture, FolderNode, FileNode } from '@/lib/architecture-generator';

interface ArchitectureProposalProps {
  architecture: ProjectArchitecture;
  onConfirm: () => void;
  onModify: () => void;
}

export default function ArchitectureProposal({ architecture, onConfirm, onModify }: ArchitectureProposalProps) {
  const renderFolderTree = (node: FolderNode | FileNode, depth: number = 0): JSX.Element => {
    if (node.type === 'file') {
      return (
        <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${depth * 20}px` }}>
          <i className="fa-solid fa-file text-orange-400 text-xs"></i>
          <span className="text-white font-mono text-sm">{node.name}</span>
          <span className="text-mist/60 text-xs">({node.language})</span>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${depth * 20}px` }}>
          <i className="fa-solid fa-folder text-orange-400"></i>
          <span className="text-white font-mono font-bold">{node.name}/</span>
        </div>
        {Object.values(node.children).map((child, idx) => (
          <div key={idx}>{renderFolderTree(child, depth + 1)}</div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-charcoal/80 border-2 border-orange-500/30 rounded-lg p-6 space-y-6"
    >
      <div>
        <h2 className="text-white font-display text-2xl mb-2">Architecture Proposal</h2>
        <p className="text-mist text-sm">Review the proposed structure and tech stack</p>
      </div>

      {/* Tech Stack */}
      <div>
        <h3 className="text-white font-mono text-sm font-bold mb-3">Tech Stack</h3>
        <div className="flex flex-wrap gap-2">
          {architecture.techStack.map((tech, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-400 font-mono text-xs"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Folder Structure */}
      <div>
        <h3 className="text-white font-mono text-sm font-bold mb-3">Folder Structure</h3>
        <div className="bg-obsidian border border-stone rounded-lg p-4 max-h-96 overflow-y-auto">
          {renderFolderTree(architecture.folderStructure)}
        </div>
      </div>

      {/* Pages */}
      {architecture.pages.length > 0 && (
        <div>
          <h3 className="text-white font-mono text-sm font-bold mb-3">Pages ({architecture.pages.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {architecture.pages.map((page, idx) => (
              <div key={idx} className="bg-obsidian border border-stone rounded p-2">
                <div className="text-white font-mono text-xs font-bold">{page.name}</div>
                <div className="text-mist/60 text-xs">{page.route}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Components */}
      {architecture.components.length > 0 && (
        <div>
          <h3 className="text-white font-mono text-sm font-bold mb-3">Components ({architecture.components.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {architecture.components.map((comp, idx) => (
              <div key={idx} className="bg-obsidian border border-stone rounded p-2">
                <div className="text-white font-mono text-xs font-bold">{comp.name}</div>
                <div className="text-mist/60 text-xs">{comp.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* APIs */}
      {architecture.apis && architecture.apis.length > 0 && (
        <div>
          <h3 className="text-white font-mono text-sm font-bold mb-3">API Endpoints ({architecture.apis.length})</h3>
          <div className="space-y-2">
            {architecture.apis.map((api, idx) => (
              <div key={idx} className="bg-obsidian border border-stone rounded p-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                    api.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                    api.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                    api.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {api.method}
                  </span>
                  <span className="text-white font-mono text-sm">{api.endpoint}</span>
                </div>
                <div className="text-mist/60 text-xs mt-1">{api.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      <div>
        <h3 className="text-white font-mono text-sm font-bold mb-3">Dependencies</h3>
        <div className="bg-obsidian border border-stone rounded-lg p-4">
          <div className="text-mist/80 text-xs font-mono">
            {Object.keys(architecture.dependencies).length} dependencies, {Object.keys(architecture.devDependencies).length} dev dependencies
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t border-stone">
        <button
          onClick={onConfirm}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-orange-700 transition shadow-lg shadow-orange-500/30"
        >
          Confirm & Generate
        </button>
        <button
          onClick={onModify}
          className="px-6 py-3 border-2 border-stone text-mist font-mono rounded-lg hover:border-orange-400 hover:text-white transition"
        >
          Modify Requirements
        </button>
      </div>
    </motion.div>
  );
}

