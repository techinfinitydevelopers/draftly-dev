'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generatePreviewHTML } from '@/lib/preview-generator';
import { CREDIT_COSTS, FULL_APP_CREDIT_BUDGET } from '@/lib/subscription-plans';
import { FULL_APP_HANDOFF_STORAGE_KEY } from '@/lib/full-app-handoff';
import { planCanExportZip } from '@/lib/plan-entitlements';
import JSZip from 'jszip';
import { devError } from '@/lib/client-log';

const GENERATION_TIMEOUT_MS = 16 * 60 * 1000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e: any) {
    clearTimeout(id);
    if (e?.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw e;
  }
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ProjectState {
  projectId?: string;
  files: { [path: string]: string };
  designSystem?: any;
  appStructure?: any;
  componentTree?: any;
  theme?: string;
  colorScheme?: string;
}

interface UploadedAsset {
  id: string;
  name: string;
  dataUrl: string;
  type: 'image' | 'logo' | 'icon';
}

// File tree node type
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

function buildFileTree(files: { [path: string]: string }): FileNode[] {
  const root: FileNode[] = [];
  const paths = Object.keys(files).sort();

  for (const filePath of paths) {
    const parts = filePath.split('/');
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      const existing = currentLevel.find(n => n.name === part);
      if (existing) {
        if (!isFile && existing.children) {
          currentLevel = existing.children;
        }
      } else {
        const node: FileNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };
        currentLevel.push(node);
        if (!isFile && node.children) {
          currentLevel = node.children;
        }
      }
    }
  }

  return sortFileTree(root);
}

function sortFileTree(nodes: FileNode[]): FileNode[] {
  return nodes.sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  }).map(n => ({
    ...n,
    children: n.children ? sortFileTree(n.children) : undefined,
  }));
}

function filterFileTree(nodes: FileNode[], search: string): FileNode[] {
  if (!search.trim()) return nodes;
  const q = search.trim().toLowerCase();
  const matches = (path: string) => path.toLowerCase().includes(q);
  const filterNodes = (list: FileNode[]): FileNode[] => {
    const out: FileNode[] = [];
    for (const n of list) {
      if (n.type === 'file') {
        if (matches(n.path) || matches(n.name)) out.push(n);
      } else if (n.children) {
        const filtered = filterNodes(n.children);
        if (filtered.length > 0 || matches(n.path) || matches(n.name)) {
          out.push({ ...n, children: filtered.length ? filtered : n.children });
        }
      }
    }
    return out;
  };
  return filterNodes(nodes);
}

function getFileIcon(filename: string): string {
  if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return 'fa-brands fa-js text-blue-400';
  if (filename.endsWith('.jsx') || filename.endsWith('.js')) return 'fa-brands fa-js text-yellow-400';
  if (filename.endsWith('.css')) return 'fa-solid fa-palette text-purple-400';
  if (filename.endsWith('.json')) return 'fa-solid fa-brackets-curly text-green-400';
  if (filename.endsWith('.md')) return 'fa-solid fa-file-lines text-white/50';
  if (filename.endsWith('.html')) return 'fa-brands fa-html5 text-orange-400';
  if (filename === '.gitignore') return 'fa-brands fa-git-alt text-red-400';
  return 'fa-solid fa-file text-white/40';
}

function getLanguage(filename: string): string {
  if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return 'typescript';
  if (filename.endsWith('.jsx') || filename.endsWith('.js')) return 'javascript';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.md')) return 'markdown';
  if (filename.endsWith('.html')) return 'html';
  return 'text';
}

// Credit usage bar component
function CreditBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isLow = pct > 75;
  const isCritical = pct > 90;
  const remaining = Math.max(0, total - used);

  return (
    <div className="px-4 py-3 border-b border-white/[0.06] bg-[#0c0c16]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label}</span>
        <span className={`text-[10px] font-bold ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
          {remaining.toLocaleString()} remaining
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-white/30">{used.toLocaleString()} used</span>
        <span className="text-[9px] text-white/30">{total.toLocaleString()} total</span>
      </div>
    </div>
  );
}

// Recursive file tree component
function FileTreeNode({
  node,
  depth,
  selectedFile,
  expandedFolders,
  onSelect,
  onToggleFolder,
}: {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  onSelect: (path: string) => void;
  onToggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.path === selectedFile;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.path)}
          className="w-full flex items-center gap-1.5 py-1 px-2 text-[11px] text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all rounded"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-[7px] text-white/30 w-3`} />
          <i className={`fa-solid ${isExpanded ? 'fa-folder-open' : 'fa-folder'} text-[10px] text-amber-400/70`} />
          <span className="truncate">{node.name}</span>
        </button>
        <AnimatePresence>
          {isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {node.children.map(child => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  selectedFile={selectedFile}
                  expandedFolders={expandedFolders}
                  onSelect={onSelect}
                  onToggleFolder={onToggleFolder}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 py-1 px-2 text-[11px] transition-all rounded ${
        isSelected
          ? 'bg-white/[0.08] text-white'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <i className={`${getFileIcon(node.name)} text-[10px]`} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function FullAppBuilder() {
  const { user, signInWithGoogle } = useAuth();
  const { subscription, generationTracking, isBasic, isPro, isPremium, isOwner, fullAppsRemaining, fullAppsLimit, loading: subLoading } = useSubscription();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectState, setProjectState] = useState<ProjectState>({ files: {} });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isInitialGeneration, setIsInitialGeneration] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsTotal, setCreditsTotal] = useState(0);
  const [rightPanel, setRightPanel] = useState<'preview' | 'code'>('preview');
  const [generationStatus, setGenerationStatus] = useState('');
  const [projectName, setProjectName] = useState('my-app');
  const [theme, setTheme] = useState<string>('professional');
  const [colorScheme, setColorScheme] = useState<string>('dark');
  const [showOptions, setShowOptions] = useState(false);
  const [leftTab, setLeftTab] = useState<'chat' | 'files' | 'assets'>('chat');
  const [fileSearch, setFileSearch] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Init credits from subscription (owner gets unlimited)
  useEffect(() => {
    const planCredits: Record<string, number> = {
      free: 0,
      tester: 200,
      basic: 1500,
      'basic-plus': 2500,
      pro: 6000,
      premium: 25000,
      agency: 125000,
    };
    setCreditsTotal(isOwner ? 999999 : (planCredits[subscription.plan] ?? 0));
    setCreditsUsed(generationTracking.creditsUsed || 0);
  }, [subscription.plan, generationTracking.creditsUsed, isOwner]);

  // Sync generation limits on load (persists billing-cycle reset so "limit reached" doesn't show stale data)
  useEffect(() => {
    if (!user?.uid || isOwner) return;
    fetch(`/api/sync-generation-limits?userId=${encodeURIComponent(user.uid)}`).catch(() => {});
  }, [user?.uid, isOwner]);

  // Carry over description from 3D Builder when user chose "Full Application"
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FULL_APP_HANDOFF_STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FULL_APP_HANDOFF_STORAGE_KEY);
      const o = JSON.parse(raw) as { sitePrompt?: string; bgPrompt?: string; chatDraft?: string };
      const parts = [o.sitePrompt, o.bgPrompt, o.chatDraft].filter((x) => typeof x === 'string' && x.trim());
      if (!parts.length) return;
      const combined = parts.join('\n\n---\n\n');
      setInput((prev) => ((prev || '').trim() ? prev : combined));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      prevMessagesLengthRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Auto-expand top-level folders when files change
  useEffect(() => {
    const paths = Object.keys(projectState.files);
    const topFolders = new Set<string>();
    for (const p of paths) {
      const first = p.split('/')[0];
      if (p.includes('/')) topFolders.add(first);
    }
    setExpandedFolders(prev => {
      const next = new Set(prev);
      topFolders.forEach(f => next.add(f));
      return next;
    });
    // Select first file if none selected
    if (!selectedFile && paths.length > 0) {
      const entry = paths.find(p => p.includes('page.')) || paths.find(p => p.includes('App.')) || paths[0];
      setSelectedFile(entry);
    }
  }, [projectState.files]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploadedAssets(prev => [
          ...prev,
          {
            id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            dataUrl,
            type: file.name.toLowerCase().includes('logo') ? 'logo' : file.name.toLowerCase().includes('icon') ? 'icon' : 'image',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (assetInputRef.current) assetInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    setGenerationStatus(isInitialGeneration ? 'Generating your application...' : 'Applying changes...');

    try {
      if (isInitialGeneration) {
        await generateFullApp(input.trim());
        setIsInitialGeneration(false);
      } else {
        await iterateApp(input.trim());
      }
    } catch (error: any) {
      devError('Generation error', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error.message || 'Failed to generate'}. You can try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const generateFullApp = async (prompt: string) => {
    // Include uploaded assets info in the prompt
    let enhancedPrompt = prompt;
    if (uploadedAssets.length > 0) {
      const assetList = uploadedAssets.map(a => `- ${a.name} (${a.type})`).join('\n');
      enhancedPrompt += `\n\nThe user has uploaded these assets to include in the app:\n${assetList}\nPlease reference these in the design where appropriate.`;
    }

    setGenerationStatus('Generating app (trying best available AI model)…');

    const response = await fetchWithTimeout(
      '/api/generate-full-app',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          framework: 'nextjs',
          projectName: projectName.trim() || 'my-app',
          userId: user?.uid,
          theme: theme || 'professional',
          colorScheme: colorScheme || 'dark',
          requirements: {
            theme: theme || 'professional',
            colorScheme: colorScheme || 'dark',
            projectName: projectName.trim() || 'my-app',
          },
          outputFormat: 'json',
        }),
      },
      GENERATION_TIMEOUT_MS
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate app');
    }

    const project = data.project;
    if (!project?.id || !project?.files) {
      throw new Error('Invalid response from server. Please try again.');
    }

    // Inject uploaded assets as data URLs into the project files
    const filesWithAssets = { ...project.files };
    if (uploadedAssets.length > 0) {
      // Create a simple assets manifest
      const assetMap: Record<string, string> = {};
      uploadedAssets.forEach(a => {
        assetMap[a.name] = a.dataUrl;
      });
      filesWithAssets['lib/assets.js'] = `// Uploaded assets (base64 data URLs)\nexport const assets = ${JSON.stringify(assetMap, null, 2)};\n`;
    }

    setProjectState({
      projectId: project.id,
      files: filesWithAssets,
      designSystem: project.designSystem,
      theme: project.theme,
      colorScheme: project.colorScheme,
    });

    updatePreview(filesWithAssets);
    setRightPanel('preview');

    const fileCount = Object.keys(filesWithAssets).length;
    const folders = new Set(Object.keys(filesWithAssets).map(p => p.split('/')[0]).filter(f => Object.keys(filesWithAssets).some(p => p.startsWith(f + '/')))).size;

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Your app is ready! Generated ${fileCount} files across ${folders} folders.\n\nYou can now:\n- Browse files in the file tree on the left\n- View the live preview on the right\n- Ask me to make changes (I'll only modify the relevant files)\n- Upload images/logos to include in your app\n- Download the complete project as a ZIP`,
        timestamp: new Date(),
      },
    ]);
  };

  const iterateApp = async (prompt: string) => {
    if (!projectState.projectId) {
      throw new Error('No project to iterate on');
    }

    setGenerationStatus('Analyzing changes needed...');

    const response = await fetchWithTimeout(
      '/api/iterate-project',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectState.projectId,
          userId: user?.uid,
          prompt,
          currentState: {
            files: projectState.files,
            designSystem: projectState.designSystem,
            appStructure: projectState.appStructure,
            componentTree: projectState.componentTree,
          },
        }),
      },
      GENERATION_TIMEOUT_MS
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to iterate');
    }
    
    const updatedFiles = { ...projectState.files };
    const changedFiles: string[] = [];

    if (data.changes?.modified) {
      Object.assign(updatedFiles, data.changes.modified);
      changedFiles.push(...Object.keys(data.changes.modified).map(f => `Modified: ${f}`));
    }
    if (data.changes?.added) {
      Object.assign(updatedFiles, data.changes.added);
      changedFiles.push(...Object.keys(data.changes.added).map(f => `Added: ${f}`));
    }
    if (data.changes?.deleted) {
      data.changes.deleted.forEach((path: string) => {
        delete updatedFiles[path];
        changedFiles.push(`Deleted: ${path}`);
      });
    }

    setProjectState(prev => ({ ...prev, files: updatedFiles }));
    updatePreview(updatedFiles);

    // Update credits from response
    if (data.creditsUsed !== undefined) setCreditsUsed(data.creditsUsed);
    if (data.creditsTotal !== undefined) setCreditsTotal(data.creditsTotal);

    // Select first changed file to show the diff
    const firstModified = Object.keys(data.changes?.modified || {})[0] || Object.keys(data.changes?.added || {})[0];
    if (firstModified) {
      setSelectedFile(firstModified);
      setRightPanel('code');
    }

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Changes applied!\n\n${changedFiles.join('\n')}\n\n${data.creditsRemaining !== undefined ? `Credits remaining: ${data.creditsRemaining.toLocaleString()}` : ''}`,
        timestamp: new Date(),
      },
    ]);
  };

  const updatePreview = (files: { [path: string]: string }) => {
    try {
      let framework = 'nextjs';
      if (files['package.json']) {
        try {
          const packageJson = JSON.parse(files['package.json']);
          if (packageJson.dependencies?.next) framework = 'nextjs';
          else if (packageJson.dependencies?.react) framework = 'react';
          else if (packageJson.dependencies?.vue) framework = 'vue';
        } catch {}
      }
      
      const previewHTML = generatePreviewHTML({
        files,
        framework,
        projectName: projectState.projectId || 'Preview',
      });
      
      const blob = new Blob([previewHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (error) {
      devError('Preview generation error', error);
    }
  };

  const handleNewProject = () => {
    if (confirm('Start a new project? This will clear the current app, chat history, and uploaded assets.')) {
      setProjectState({ files: {} });
      setMessages([]);
      setPreviewUrl('');
      setIsInitialGeneration(true);
      setSelectedFile(null);
      setUploadedAssets([]);
      setLeftTab('chat');
      setFileSearch('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const handleCopyCode = async () => {
    if (!selectedFile || !projectState.files[selectedFile]) return;
    try {
      await navigator.clipboard.writeText(projectState.files[selectedFile]);
      setCopiedPath(selectedFile);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = projectState.files[selectedFile];
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedPath(selectedFile);
      setTimeout(() => setCopiedPath(null), 2000);
    }
  };

  const handleRegenerate = async () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser || isGenerating || !projectState.projectId) return;
    // Remove last user + assistant pair from UI
    setMessages(prev => {
      const lastUserIdx = prev.map((m, i) => ({ m, i })).reverse().find(x => x.m.role === 'user')?.i ?? -1;
      return prev.slice(0, lastUserIdx);
    });
    setIsGenerating(true);
    setGenerationStatus('Regenerating...');
    try {
      await iterateApp(lastUser.content);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${error.message || 'Failed to regenerate'}.`, timestamp: new Date() },
      ]);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const canExportZipFullApp = planCanExportZip(subscription.plan, { isOwner });

  const handleDownload = async () => {
    if (Object.keys(projectState.files).length === 0) return;
    if (!canExportZipFullApp) {
      alert('ZIP export requires Premium ($200/mo) or higher. You can keep editing in the builder; upgrade when you are ready to export.');
      router.push('/pricing');
      return;
    }

    try {
      const zip = new JSZip();
      for (const [path, content] of Object.entries(projectState.files)) {
        zip.file(path, content);
      }
      // Include uploaded assets
      for (const asset of uploadedAssets) {
        const base64 = asset.dataUrl.split(',')[1];
        if (base64) {
          zip.file(`public/assets/${asset.name}`, base64, { base64: true });
        }
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectState.projectId || 'app'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      devError('Download error', error);
      alert('Failed to download project');
    }
  };

  const canAccess = isPro || isPremium || isOwner;
  const fileTree = buildFileTree(projectState.files);
  const filteredFileTree = filterFileTree(fileTree, fileSearch);
  const selectedFileContent = selectedFile ? projectState.files[selectedFile] || '' : '';
  const fileCount = Object.keys(projectState.files).length;

  // Auth gate
  if (!subLoading && !user) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mx-auto">
            <i className="fa-solid fa-code text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white">Full App Builder</h1>
          <p className="text-white/50 text-[15px]">Build complete, functional web applications end-to-end with AI. Sign in to get started.</p>
          <button
            onClick={() => void signInWithGoogle()}
            className="px-8 py-3 bg-white text-black rounded-xl font-bold text-[14px] hover:bg-white/90 transition-all"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Plan gate
  if (!subLoading && !canAccess) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mx-auto">
            <i className="fa-solid fa-lock text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white">Upgrade Required</h1>
          <p className="text-white/50 text-[15px]">Full App Builder is recommended for Pro ($60/mo) or higher. A full build can take 10-15 minutes and consumes a high credit budget.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/pricing')} className="px-6 py-3 bg-white text-black rounded-xl font-bold text-[14px] hover:bg-white/90 transition-all">
              View Plans
            </button>
            <button onClick={() => router.push('/3d-builder')} className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-[14px] hover:bg-white/15 transition-all border border-white/10">
              3D Builder
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Limit gate (owner bypassed via fullAppsRemaining=999999 in useSubscription)
  if (!subLoading && canAccess && !isOwner && fullAppsRemaining <= 0 && isInitialGeneration) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center mx-auto">
            <i className="fa-solid fa-gauge-high text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white">Limit Reached</h1>
          <p className="text-white/50 text-[15px]">
            You&apos;ve used all {fullAppsLimit} full app build{fullAppsLimit > 1 ? 's' : ''} this month.
            {subscription.plan !== 'premium' ? ' Upgrade for more builds.' : ' Resets on your next billing cycle.'}
          </p>
          {subscription.plan !== 'premium' && (
            <button onClick={() => router.push('/pricing')} className="px-6 py-3 bg-white text-black rounded-xl font-bold text-[14px] hover:bg-white/90 transition-all">
              Upgrade Plan
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#08080f] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-12 border-b border-white/[0.06] bg-[#0a0a14] flex items-center px-4 gap-4 flex-shrink-0">
        <button onClick={() => router.push('/')} className="text-white/40 hover:text-white/70 transition-colors">
          <i className="fa-solid fa-arrow-left text-[12px]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <i className="fa-solid fa-code text-white text-[10px]" />
          </div>
          <span className="text-[13px] font-bold text-white">Full App Builder</span>
          {projectState.projectId && (
            <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
              {fileCount} files
            </span>
          )}
        </div>
        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-1.5">
          <Link
            href="/business"
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.1] hover:text-white transition-all"
          >
            Business Suite
          </Link>
          <Link
            href="/business/integrations"
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-500/15 border border-violet-500/25 text-violet-200 hover:bg-violet-500/25 transition-all"
          >
            Integrate
          </Link>
        </div>

        {/* Credits indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <i className="fa-solid fa-coins text-[9px] text-amber-400" />
            <span className="text-[10px] font-bold text-white/60">
              {isOwner ? 'Unlimited credits' : `${Math.max(0, creditsTotal - creditsUsed).toLocaleString()} credits`}
            </span>
          </div>
          <span className="text-[10px] text-white/30">
            {isOwner ? 'Unlimited builds' : `${fullAppsRemaining}/${fullAppsLimit} builds left`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {projectState.projectId && (
            <>
              <button
                onClick={handleNewProject}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.1] hover:text-white transition-all"
                title="Start new project"
              >
                <i className="fa-solid fa-plus mr-1.5 text-[9px]" />
                New
              </button>
              <button
                onClick={handleDownload}
                disabled={!canExportZipFullApp}
                title={!canExportZipFullApp ? 'Premium ($200/mo)+ required for ZIP export' : undefined}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-download mr-1.5 text-[9px]" />
                Download ZIP
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar: Chat + File Tree */}
        <div className="w-[380px] flex flex-col border-r border-white/[0.06] flex-shrink-0">
          {/* Credit bar */}
          <CreditBar
            used={creditsUsed}
            total={creditsTotal}
            label="Gemini 3 Pro Credits"
          />

          {/* Tabs: Chat / Files / Assets */}
          <div className="flex border-b border-white/[0.06]">
            {(['chat', 'files', 'assets'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all text-center ${
                  leftTab === tab ? 'text-white border-violet-500/60' : 'text-white/40 hover:text-white/70 border-transparent hover:border-white/20'
                }`}
              >
                {tab === 'chat' && <><i className="fa-solid fa-comments mr-1.5 text-[9px]" />Chat</>}
                {tab === 'files' && <><i className="fa-solid fa-folder-tree mr-1.5 text-[9px]" />Files ({fileCount})</>}
                {tab === 'assets' && <><i className="fa-solid fa-image mr-1.5 text-[9px]" />Assets ({uploadedAssets.length})</>}
              </button>
            ))}
          </div>

          {/* Tab panels - flex-1 to fill space above input */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {leftTab === 'files' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {fileCount > 0 ? (
                <>
                  <div className="p-2 border-b border-white/[0.06]">
                    <input
                      value={fileSearch}
                      onChange={e => setFileSearch(e.target.value)}
                      placeholder="Search files..."
                      className="w-full px-2 py-1.5 rounded text-[11px] bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-violet-500/30"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredFileTree.length > 0 ? (
                      filteredFileTree.map(node => (
                        <FileTreeNode
                          key={node.path}
                          node={node}
                          depth={0}
                          selectedFile={selectedFile}
                          expandedFolders={expandedFolders}
                          onSelect={(path) => {
                            setSelectedFile(path);
                            setRightPanel('code');
                          }}
                          onToggleFolder={toggleFolder}
                        />
                      ))
                    ) : (
                      <p className="px-3 py-4 text-[11px] text-white/40">No files match &quot;{fileSearch}&quot;</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4 text-center">
                  <p className="text-[12px] text-white/40">Generate an app to see files here.</p>
                </div>
              )}
            </div>
          )}

          {leftTab === 'assets' && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-white/50">Upload images, logos, icons</span>
                <input
                  type="file"
                  ref={assetInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAssetUpload}
                />
                <button
                  onClick={() => assetInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 transition-all"
                >
                  <i className="fa-solid fa-upload mr-1.5 text-[9px]" />
                  Upload
                </button>
              </div>
              {uploadedAssets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {uploadedAssets.map(asset => (
                    <div key={asset.id} className="relative group">
                      <img src={asset.dataUrl} alt={asset.name} className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                      <button
                        onClick={() => setUploadedAssets(prev => prev.filter(a => a.id !== asset.id))}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                      <span className="block mt-1 text-[9px] text-white/50 truncate max-w-[64px]">{asset.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-2">
                    <i className="fa-solid fa-image text-white/30 text-xl" />
                  </div>
                  <p className="text-[11px] text-white/40 mb-2">No assets uploaded</p>
                  <button
                    onClick={() => assetInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] hover:text-white transition-all"
                  >
                    Upload images
                  </button>
                </div>
              )}
            </div>
          )}

          {leftTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
            {messages.length === 0 && (
              <div className="text-center mt-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center mx-auto">
                  <i className="fa-solid fa-wand-magic-sparkles text-violet-400" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">Build your application</p>
                  <p className="text-[12px] text-white/40 mt-1 max-w-[280px] mx-auto">Full website from frontend to backend. API routes, professional UI, animations. Describe what you want.</p>
                </div>

                {/* Options: theme, color, project name */}
                <div className="text-left max-w-[300px] mx-auto">
                  <button onClick={() => setShowOptions(!showOptions)} className="text-[10px] text-white/40 hover:text-white/60 flex items-center gap-1.5">
                    <i className={`fa-solid fa-chevron-${showOptions ? 'up' : 'down'} text-[8px]`} />
                    {showOptions ? 'Hide options' : 'Theme & options'}
                  </button>
                  {showOptions && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 space-y-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div>
                        <label className="text-[9px] text-white/40 uppercase">Project name</label>
                        <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="my-app" className="w-full mt-0.5 px-2 py-1 rounded text-[11px] bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20" />
                      </div>
                      <div>
                        <label className="text-[9px] text-white/40 uppercase">Theme</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['professional', 'minimal', 'cinematic', 'luxury', 'gaming'].map(t => (
                            <button key={t} onClick={() => setTheme(t)} className={`px-2 py-0.5 rounded text-[10px] ${theme === t ? 'bg-violet-500/30 text-white' : 'bg-white/[0.04] text-white/50 hover:text-white/70'}`}>{t}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] text-white/40 uppercase">Colors</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['dark', 'light', 'blue', 'purple', 'green', 'orange'].map(c => (
                            <button key={c} onClick={() => setColorScheme(c)} className={`px-2 py-0.5 rounded text-[10px] ${colorScheme === c ? 'bg-violet-500/30 text-white' : 'bg-white/[0.04] text-white/50 hover:text-white/70'}`}>{c}</button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-1.5 pt-2">
                  <p className="text-[9px] text-white/30 uppercase">Quick start</p>
                  {[
                    'Task manager with CRUD, API routes, and drag-and-drop',
                    'SaaS dashboard with charts, data tables, and settings',
                    'E-commerce product page with cart and checkout flow',
                    'Portfolio with project gallery and contact form',
                    'Restaurant landing page with menu, reservations, and map',
                    'Blog with posts list, categories, and search',
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(example)}
                      className="block w-full text-left px-3 py-2 rounded-lg text-[11px] text-white/40 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60 hover:border-white/[0.1] transition-all"
                    >
                      <i className="fa-solid fa-arrow-right text-[8px] mr-2 text-violet-400/50" />
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <motion.div
                key={`msg-${idx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-500/20 border border-violet-500/20 text-white/90'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white/70'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
            {isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 text-white/50 text-[12px]">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 border-2 border-violet-400/30 border-t-violet-400 rounded-full"
                    />
                    <span>{generationStatus || 'Generating...'}</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
            </div>
            </div>
          )}
          </div>

          {/* Input area - always visible */}
          <div className="p-3 border-t border-white/[0.06] bg-[#0a0a14] flex-shrink-0">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isInitialGeneration ? 'Describe the app you want to build...' : 'Describe changes to make...'}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/25 focus:outline-none focus:border-violet-500/30 resize-none min-h-[40px] max-h-[120px]"
                  disabled={isGenerating}
                  rows={1}
                />
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <input
                  type="file"
                  ref={assetInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAssetUpload}
                />
                <button
                  onClick={() => assetInputRef.current?.click()}
                  disabled={isGenerating}
                  className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white/70 transition-all flex items-center justify-center disabled:opacity-30"
                  title="Upload images, logos, icons"
                >
                  <i className="fa-solid fa-image text-[11px]" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={isGenerating || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-violet-500 text-white hover:bg-violet-600 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <i className="fa-solid fa-arrow-up text-[11px]" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 mt-1.5 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-white/20">
                  {CREDIT_COSTS.fullAppChat} credits per message
                </span>
                <span className="text-[9px] text-white/20">
                  Powered by Gemini 3 Pro Preview
                </span>
              </div>
              {!isInitialGeneration && messages.length >= 2 && (
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="text-[9px] text-white/30 hover:text-violet-400 transition-colors flex items-center gap-1"
                >
                  <i className="fa-solid fa-rotate-right text-[8px]" />
                  Regenerate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: Preview / Code */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Panel tabs */}
          <div className="h-9 border-b border-white/[0.06] bg-[#0a0a14] flex items-center px-2 gap-1">
            <button
              onClick={() => setRightPanel('preview')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                rightPanel === 'preview'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              <i className="fa-solid fa-eye mr-1.5 text-[9px]" />
              Preview
            </button>
            <button
              onClick={() => setRightPanel('code')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                rightPanel === 'code'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              <i className="fa-solid fa-code mr-1.5 text-[9px]" />
              Code
              {selectedFile && <span className="ml-1.5 text-white/30 font-normal">{selectedFile.split('/').pop()}</span>}
            </button>
            <div className="flex-1" />
            {rightPanel === 'preview' && previewUrl && (
              <button
                onClick={() => {
                  const w = window.open('', '_blank');
                  if (w) {
                    w.document.write(`<iframe src="${previewUrl}" style="width:100%;height:100vh;border:none"></iframe>`);
                  }
                }}
                className="px-2 py-1 rounded text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {rightPanel === 'preview' ? (
              previewUrl ? (
                <iframe
                  ref={previewIframeRef}
                  src={previewUrl}
                  className="w-full h-full border-none bg-white"
                  title="App Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#0c0c16]">
                  <div className="text-center text-white/30 space-y-3">
                    <i className="fa-solid fa-browser text-4xl" />
                    <p className="text-[13px]">Preview will appear here</p>
                    <p className="text-[11px] text-white/20">Start by describing your app in the chat</p>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col bg-[#0c0c16]">
                {selectedFile ? (
                  <>
                    <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-2">
                      <i className={`${getFileIcon(selectedFile)} text-[10px]`} />
                      <span className="text-[11px] text-white/60 font-mono truncate flex-1 min-w-0">{selectedFile}</span>
                      <span className="text-[9px] text-white/20 flex-shrink-0">{selectedFileContent.length.toLocaleString()} chars</span>
                      <button
                        onClick={handleCopyCode}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-white/[0.06] border border-white/[0.08] text-white/60 hover:bg-white/[0.1] hover:text-white transition-all flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        {copiedPath === selectedFile ? <><i className="fa-solid fa-check text-emerald-400 mr-1" />Copied</> : <><i className="fa-solid fa-copy mr-1 text-[9px]" />Copy</>}
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <pre className="p-4 text-[11px] font-mono text-white/70 leading-relaxed whitespace-pre-wrap break-all">
                        {selectedFileContent}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-white/20 text-[12px]">
                    Select a file from the tree to view its code
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
