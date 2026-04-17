'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import StudioCanvas from '@/components/studio/StudioCanvas';
import NodeSidebar from '@/components/studio/NodeSidebar';
import OutputPanel from '@/components/studio/OutputPanel';
import GenerationGallery from '@/components/studio/GenerationGallery';
import { useStudioStore, type WorkflowMeta } from '@/lib/studio-store';

export default function StudioPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const { subscription } = useSubscription();
  const showTierBadge =
    subscription.status === 'active' &&
    ['basic', 'pro', 'premium', 'agency', 'tester'].includes(subscription.plan);
  const tierLabel = subscription.plan.toUpperCase();
  const tierBadgeClass =
    subscription.plan === 'premium'
      ? 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/30'
      : subscription.plan === 'pro'
      ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
      : subscription.plan === 'basic'
      ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/30'
      : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30';
  const [showOutput, setShowOutput] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [showGenerationGallery, setShowGenerationGallery] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [showTemplates, setShowTemplates] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  const {
    currentWorkflowName,
    setWorkflowName,
    isSaving,
    lastSavedAt,
    saveWorkflow,
    loadWorkflowList,
    loadWorkflow,
    deleteWorkflow,
    newWorkflow,
    workflows,
    nodes,
    edges,
    undo,
    redo,
    undoStack,
    redoStack,
    loadTemplate,
    triggerBatchImages,
    triggerBatchVideos,
    setGlobalImageModel,
    setGlobalVideoModel,
  } = useStudioStore();

  // Count image/video gen nodes and their states
  const nodeStats = useMemo(() => {
    const imageNodes = nodes.filter((n) => n.type === 'imageGen');
    const videoNodes = nodes.filter((n) => n.type === 'videoGen');
    const imageRunning = imageNodes.filter((n) => (n.data as Record<string, unknown>).isRunning).length;
    const videoRunning = videoNodes.filter((n) => (n.data as Record<string, unknown>).isRunning).length;
    const imagesDone = imageNodes.filter((n) => {
      const imgs = (n.data as Record<string, unknown>).outputImages;
      return Array.isArray(imgs) && imgs.length > 0;
    }).length;
    const videosDone = videoNodes.filter((n) => (n.data as Record<string, unknown>).outputUrl).length;
    // Get current model from first node (they should be synced via global model selector)
    const currentImageModel = imageNodes.length > 0 ? ((imageNodes[0].data as Record<string, unknown>).model as string) || 'nano-banana-pro' : 'nano-banana-pro';
    const currentVideoModel = videoNodes.length > 0 ? ((videoNodes[0].data as Record<string, unknown>).model as string) || 'veo-3.1-fast' : 'veo-3.1-fast';
    return {
      imageCount: imageNodes.length,
      videoCount: videoNodes.length,
      imageRunning,
      videoRunning,
      imagesDone,
      videosDone,
      currentImageModel,
      currentVideoModel,
    };
  }, [nodes]);

  // Sync user ID into the store so nodes can include it in API calls
  const setCurrentUserId = useStudioStore((s) => s.setCurrentUserId);
  useEffect(() => {
    setCurrentUserId(user?.uid || null);
  }, [user?.uid, setCurrentUserId]);

  // Auto-save every 30 seconds if there are nodes
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    autoSaveRef.current = setInterval(() => {
      const { nodes: currentNodes } = useStudioStore.getState();
      if (currentNodes.length > 0) {
        saveWorkflow(user.uid);
      }
    }, 30000);

    // Save when user navigates away or closes the tab (trigger async save — best effort)
    const handleBeforeUnload = () => {
      const { nodes: n } = useStudioStore.getState();
      if (n.length > 0 && user?.uid) {
        // Fire-and-forget local save (IndexedDB is async but the browser
        // keeps the micro-task alive long enough for small writes)
        saveWorkflow(user.uid);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.uid, saveWorkflow]);

  // Load workflow list on mount + auto-load the most recent workflow or default template
  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    if (!user?.uid) return;

    const autoLoad = async () => {
      await loadWorkflowList(user.uid);

      // Auto-load the most recent workflow if the canvas is empty
      const { workflows: wfList, nodes: currentNodes } = useStudioStore.getState();
      if (!hasAutoLoaded.current && currentNodes.length === 0) {
        hasAutoLoaded.current = true;
        if (wfList.length > 0) {
          // Load most recent saved workflow
          await loadWorkflow(user.uid, wfList[0].id);
        } else {
          // No saved workflows — load the Quick Image Pack (5 cinematic images)
          loadTemplate('quick-image-5');
        }
      }
    };

    autoLoad();
  }, [user?.uid, loadWorkflowList, loadWorkflow, loadTemplate]);

  const handleSave = useCallback(() => {
    if (user?.uid) saveWorkflow(user.uid);
  }, [user?.uid, saveWorkflow]);

  const handleNew = useCallback(() => {
    newWorkflow();
  }, [newWorkflow]);

  const handleLoadWorkflow = useCallback(
    (wf: WorkflowMeta) => {
      if (user?.uid) {
        loadWorkflow(user.uid, wf.id);
        setShowGallery(false);
      }
    },
    [user?.uid, loadWorkflow],
  );

  const handleDeleteWorkflow = useCallback(
    (wfId: string) => {
      if (user?.uid && confirm('Delete this workflow?')) {
        deleteWorkflow(user.uid, wfId);
      }
    },
    [user?.uid, deleteWorkflow],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl+Z = Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z or Ctrl+Y = Redo
      if (isMod && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      // Ctrl+S = Save
      if (isMod && e.key === 's') {
        e.preventDefault();
        if (user?.uid) saveWorkflow(user.uid);
      }
      // Ctrl+N = New
      if (isMod && e.key === 'n') {
        e.preventDefault();
        newWorkflow();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, saveWorkflow, newWorkflow, user?.uid]);

  // Auth loading state
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          <span className="text-xs text-white/40">Loading Studio...</span>
        </div>
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-diagram-project text-violet-400 text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-white mb-2 font-display">AI Creative Studio</h1>
            <p className="text-sm text-white/50 mb-6">
              Create stunning images and videos with a visual node-based workflow.
              Connect AI models together to build your creative pipeline.
            </p>
            <button
              onClick={() => void signInWithGoogle()}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-brands fa-google text-sm"></i>
              Sign in to get started
            </button>
            <Link href="/" className="inline-block mt-4 text-xs text-white/30 hover:text-white/50 transition-all">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050505]">
      {/* Top bar */}
      <div className="h-12 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-2 sm:px-4 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 md:hidden shrink-0"
          >
            <i className={`fa-solid ${showMobileSidebar ? 'fa-times' : 'fa-bars'} text-xs`}></i>
          </button>

          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-5 h-5 bg-orange-500 rounded-sm flex items-center justify-center group-hover:rotate-180 transition-transform duration-300">
              <div className="w-1.5 h-1.5 bg-black rounded-sm"></div>
            </div>
            <span className="font-display font-bold text-xs tracking-tight text-white/80 group-hover:text-white transition-all hidden sm:inline">
              DRAFTLY
            </span>
          </Link>
          <div className="w-px h-5 bg-white/10 hidden sm:block"></div>
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <i className="fa-solid fa-diagram-project text-violet-400 text-xs"></i>
            <span className="text-xs font-semibold text-white/70">Studio</span>
          </div>
          <div className="w-px h-5 bg-white/10 hidden sm:block"></div>
          {/* Workflow name (editable) */}
          <input
            type="text"
            value={currentWorkflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-xs text-white/60 focus:text-white/90 border-none focus:outline-none focus:bg-white/5 rounded px-2 py-1 w-24 sm:w-36 truncate min-w-0"
            placeholder="Workflow name"
          />
          {/* Save status */}
          <span className="text-[10px] text-white/20 hidden lg:inline">
            {isSaving ? 'Saving...' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Undo/Redo — always visible */}
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="w-7 h-7 rounded-lg text-xs font-medium transition-all bg-transparent text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center"
            title="Undo (Ctrl+Z)"
          >
            <i className="fa-solid fa-rotate-left"></i>
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="w-7 h-7 rounded-lg text-xs font-medium transition-all bg-transparent text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center"
            title="Redo (Ctrl+Shift+Z)"
          >
            <i className="fa-solid fa-rotate-right"></i>
          </button>

          {/* Save — always visible */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-all bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 flex items-center justify-center gap-1"
            title="Save workflow"
          >
            <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Desktop-only buttons */}
          <div className="hidden md:flex items-center gap-1.5">
            <div className="w-px h-5 bg-white/10"></div>

            {/* New */}
            <button
              onClick={handleNew}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all bg-transparent text-white/40 hover:text-white/70 hover:bg-white/5"
              title="New workflow (Ctrl+N)"
            >
              <i className="fa-solid fa-plus mr-1"></i>
              <span className="hidden lg:inline">New</span>
            </button>

            {/* Clear Canvas */}
            <button
              onClick={() => {
                if (nodes.length === 0 || confirm('Clear the entire canvas? This cannot be undone.')) {
                  newWorkflow();
                }
              }}
              disabled={nodes.length === 0}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all bg-transparent text-red-400/50 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 disabled:cursor-not-allowed"
              title="Clear canvas"
            >
              <i className="fa-solid fa-trash-can mr-1"></i>
              <span className="hidden lg:inline">Clear</span>
            </button>

            {/* Templates */}
            <button
              onClick={() => setShowTemplates(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all bg-transparent text-white/40 hover:text-white/70 hover:bg-white/5"
              title="Load template"
            >
              <i className="fa-solid fa-layer-group mr-1"></i>
              <span className="hidden lg:inline">Templates</span>
            </button>

            {/* Gallery */}
            <button
              onClick={() => {
                if (user?.uid) loadWorkflowList(user.uid);
                setShowGallery(true);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10"
              title="Open workflow gallery"
            >
              <i className="fa-solid fa-folder-open mr-1"></i>
              <span className="hidden lg:inline">Open</span>
            </button>

            <div className="w-px h-5 bg-white/10 mx-1"></div>

            {/* Toggle generation gallery */}
            <button
              onClick={() => setShowGenerationGallery(!showGenerationGallery)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showGenerationGallery
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'bg-transparent text-white/40 hover:text-white/60'
              }`}
              title="Generation gallery"
            >
              <i className="fa-solid fa-images mr-1"></i>
              <span className="hidden lg:inline">Gallery</span>
            </button>

            {/* Toggle output panel */}
            <button
              onClick={() => setShowOutput(!showOutput)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showOutput
                  ? 'bg-white/10 text-white/80'
                  : 'bg-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <i className="fa-solid fa-columns mr-1"></i>
              <span className="hidden lg:inline">Details</span>
            </button>
          </div>

          {/* Mobile "more actions" menu button */}
          <button
            onClick={() => setShowMobileActions(!showMobileActions)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 md:hidden shrink-0"
          >
            <i className="fa-solid fa-ellipsis-vertical text-xs"></i>
          </button>

          {/* Tier badge or upgrade button */}
          {showTierBadge ? (
            <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 hidden sm:flex ${tierBadgeClass}`}>
              <i className="fa-solid fa-crown text-[9px]"></i>
              {tierLabel}
            </span>
          ) : (
            <button
              onClick={() => router.push('/pricing#pricing')}
              className="w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] font-bold transition-all bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 flex items-center justify-center gap-1"
            >
              <i className="fa-solid fa-crown text-[9px]"></i>
              <span className="hidden sm:inline">Upgrade</span>
            </button>
          )}

          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 hidden sm:flex">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <i className="fa-solid fa-user text-white/50 text-[10px]"></i>
            )}
          </div>
        </div>
      </div>

      {/* Mobile actions dropdown */}
      {showMobileActions && (
        <div className="md:hidden bg-[#0c0c0c] border-b border-white/5 px-3 py-2 flex flex-wrap gap-1.5 z-10 shrink-0">
          <button
            onClick={() => { handleNew(); setShowMobileActions(false); }}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/60 active:bg-white/10 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-[10px]"></i> New
          </button>
          <button
            onClick={() => {
              if (nodes.length === 0 || confirm('Clear the entire canvas?')) { newWorkflow(); }
              setShowMobileActions(false);
            }}
            disabled={nodes.length === 0}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-red-400/60 active:bg-red-500/10 disabled:opacity-30 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-trash-can text-[10px]"></i> Clear
          </button>
          <button
            onClick={() => { setShowTemplates(true); setShowMobileActions(false); }}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/60 active:bg-white/10 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-layer-group text-[10px]"></i> Templates
          </button>
          <button
            onClick={() => { if (user?.uid) loadWorkflowList(user.uid); setShowGallery(true); setShowMobileActions(false); }}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/60 active:bg-white/10 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-folder-open text-[10px]"></i> Open
          </button>
          <button
            onClick={() => { setShowGenerationGallery(!showGenerationGallery); setShowMobileActions(false); }}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${showGenerationGallery ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-white/60'}`}
          >
            <i className="fa-solid fa-images text-[10px]"></i> Gallery
          </button>
          <button
            onClick={() => { setShowOutput(!showOutput); setShowMobileActions(false); }}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${showOutput ? 'bg-white/10 text-white/80' : 'bg-white/5 text-white/60'}`}
          >
            <i className="fa-solid fa-columns text-[10px]"></i> Details
          </button>
        </div>
      )}

      {/* Workflow Gallery Modal */}
      {showGallery && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowGallery(false)}
        >
          <div
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white/90">Saved Workflows</h2>
              <button
                onClick={() => setShowGallery(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
              >
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {workflows.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-folder-open text-white/10 text-3xl mb-3"></i>
                  <p className="text-xs text-white/30">No saved workflows yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {workflows.map((wf) => (
                    <div
                      key={wf.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-all group cursor-pointer"
                      onClick={() => handleLoadWorkflow(wf)}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white/80 truncate">{wf.name}</div>
                        <div className="text-[10px] text-white/30 mt-0.5">
                          {wf.updatedAt ? new Date(wf.updatedAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorkflow(wf.id);
                        }}
                        className="w-7 h-7 rounded-lg bg-red-500/0 hover:bg-red-500/20 flex items-center justify-center text-white/0 group-hover:text-white/30 hover:!text-red-400 transition-all shrink-0"
                      >
                        <i className="fa-solid fa-trash text-[10px]"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white/90">Workflow Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
              >
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {[
                {
                  id: 'text-to-image',
                  name: 'Text to Image',
                  desc: 'Simple prompt → image generation → preview.',
                  icon: 'fa-wand-magic-sparkles',
                  color: 'blue',
                  badge: null,
                },
                {
                  id: 'image-to-video',
                  name: 'Image to Video',
                  desc: 'Prompt → image → video pipeline.',
                  icon: 'fa-film',
                  color: 'rose',
                  badge: null,
                },
                {
                  id: 'image-pipeline',
                  name: 'Image Pipeline',
                  desc: 'Upload → remove BG + upscale → variation.',
                  icon: 'fa-diagram-project',
                  color: 'violet',
                  badge: null,
                },
                {
                  id: 'quick-image-5',
                  name: 'Quick Image Pack',
                  desc: '5 cinematic angle images. Use "Generate All Images" to batch generate with one click.',
                  icon: 'fa-images',
                  color: 'blue',
                  badge: '5 images',
                },
                {
                  id: 'content-creator-10',
                  name: 'Content Creator Pack',
                  desc: '10 cinematic images + 3 videos. Batch generate all images first, then all videos.',
                  icon: 'fa-camera',
                  color: 'violet',
                  badge: '10 img + 3 vid',
                },
                {
                  id: 'full-production-15',
                  name: 'Full Production Pack',
                  desc: '15 cinematic images + 5 videos. Full production-ready asset pipeline.',
                  icon: 'fa-rocket',
                  color: 'amber',
                  badge: '15 img + 5 vid',
                },
                {
                  id: 'brand-asset-pack',
                  name: 'Brand Asset Pack',
                  desc: 'Upload brand image → 10 cinematic angles + 5 promo videos. Image-to-image editing pipeline.',
                  icon: 'fa-building',
                  color: 'rose',
                  badge: '10 img + 5 vid',
                },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    loadTemplate(tpl.id);
                    setShowTemplates(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-all text-left"
                >
                  {/* bg-blue-500/20 text-blue-400 bg-rose-500/20 text-rose-400 bg-violet-500/20 text-violet-400 bg-amber-500/20 text-amber-400 */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    tpl.color === 'blue' ? 'bg-blue-500/20' :
                    tpl.color === 'rose' ? 'bg-rose-500/20' :
                    tpl.color === 'violet' ? 'bg-violet-500/20' :
                    'bg-amber-500/20'
                  }`}>
                    <i className={`fa-solid ${tpl.icon} ${
                      tpl.color === 'blue' ? 'text-blue-400' :
                      tpl.color === 'rose' ? 'text-rose-400' :
                      tpl.color === 'violet' ? 'text-violet-400' :
                      'text-amber-400'
                    }`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/80">{tpl.name}</span>
                      {tpl.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/10 text-white/50">{tpl.badge}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">{tpl.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowUpgrade(false)}
        >
          <div
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-violet-600/30 to-blue-600/30 px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 flex items-center justify-center">
                  <i className="fa-solid fa-crown text-white text-lg"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Studio Pro</h2>
                  <p className="text-xs text-white/50">200 credits / month — images + videos</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-3xl font-bold text-white">$24</span>
                <span className="text-sm text-white/50">/month</span>
              </div>
            </div>

            {/* Features */}
            <div className="px-6 py-5 space-y-3">
              {[
                { icon: 'fa-coins', text: '200 credits / month (1 image = 1cr, 1s video = 6cr)', color: 'text-amber-400' },
                { icon: 'fa-image', text: '~150 images + 15s video (mixed usage)', color: 'text-blue-400' },
                { icon: 'fa-film', text: 'Video generation (Kling, WAN, Luma, Minimax)', color: 'text-rose-400' },
                { icon: 'fa-wand-magic-sparkles', text: 'Pro models: Flux Dev, Flux Pro, Fooocus', color: 'text-violet-400' },
                { icon: 'fa-bolt', text: 'Batch generation — one-click all nodes', color: 'text-cyan-400' },
                { icon: 'fa-layer-group', text: 'All workflow templates', color: 'text-emerald-400' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <i className={`fa-solid ${f.icon} ${f.color} text-sm w-5 text-center`}></i>
                  <span className="text-sm text-white/70">{f.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-6 pb-5 space-y-2">
              <a
                href={`https://piyushglitch.gumroad.com/l/monthlypro${user?.email ? `?email=${encodeURIComponent(user.email)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500"
              >
                <i className="fa-solid fa-crown"></i>
                Subscribe Now — $24/mo
              </a>
              <p className="text-[10px] text-white/30 text-center">
                Powered by Gumroad. Pro activates instantly after payment.
              </p>
            </div>

            {/* Close */}
            <button
              onClick={() => setShowUpgrade(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
            >
              <i className="fa-solid fa-times text-xs"></i>
            </button>
          </div>
        </div>
      )}

      {/* Batch Controls Bar — shown when there are image/video gen nodes */}
      {(nodeStats.imageCount > 0 || nodeStats.videoCount > 0) && (
        <div className="shrink-0 bg-[#0c0c0c] border-b border-white/5 px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 z-10 overflow-x-auto scrollbar-hide">
          {/* Image batch */}
          {nodeStats.imageCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                <i className="fa-solid fa-image text-blue-400/60"></i>
                <span className="font-semibold text-white/60">{nodeStats.imageCount} Image Nodes</span>
                {nodeStats.imagesDone > 0 && (
                  <span className="text-green-400/80">({nodeStats.imagesDone} done)</span>
                )}
              </div>

              {/* Global image model selector */}
              <select
                value={nodeStats.currentImageModel}
                onChange={(e) => setGlobalImageModel(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/70 focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
              >
                <option value="nano-banana-pro" className="bg-[#1a1a1a]">Nano Banana Pro (Gemini) — 5cr</option>
                <option value="seedream-4.5" className="bg-[#1a1a1a]">Seedream 4.5 (ByteDance) — ~18cr</option>
                <option value="flux-schnell" className="bg-[#1a1a1a]">🔒 Flux Schnell — 3cr (Pro)</option>
                <option value="flux-dev" className="bg-[#1a1a1a]">🔒 Flux Dev — 3cr (Pro)</option>
                <option value="flux-pro" className="bg-[#1a1a1a]">🔒 Flux Pro 1.1 — 4cr (Pro)</option>
                <option value="fooocus" className="bg-[#1a1a1a]">🔒 Fooocus — 3cr (Pro)</option>
                <option value="stable-cascade" className="bg-[#1a1a1a]">🔒 Stable Cascade — 3cr (Pro)</option>
                <option value="local-sd15" className="bg-[#1a1a1a]">Local SD 1.5 (Free)</option>
              </select>

              <button
                onClick={triggerBatchImages}
                disabled={nodeStats.imageRunning > 0}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nodeStats.imageRunning > 0 ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-[9px]"></i>
                    Generating ({nodeStats.imageRunning})
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bolt text-[9px]"></i>
                    Generate All Images
                  </>
                )}
              </button>
            </div>
          )}

          {/* Divider */}
          {nodeStats.imageCount > 0 && nodeStats.videoCount > 0 && (
            <div className="w-px h-6 bg-white/10"></div>
          )}

          {/* Video batch */}
          {nodeStats.videoCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                <i className="fa-solid fa-film text-rose-400/60"></i>
                <span className="font-semibold text-white/60">{nodeStats.videoCount} Video Nodes</span>
                {nodeStats.videosDone > 0 && (
                  <span className="text-green-400/80">({nodeStats.videosDone} done)</span>
                )}
              </div>

              {/* Global video model selector */}
              <select
                value={nodeStats.currentVideoModel}
                onChange={(e) => setGlobalVideoModel(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/70 focus:outline-none focus:border-rose-500/50 transition-all appearance-none cursor-pointer"
              >
                <option value="veo-3.1" className="bg-[#1a1a1a]">Veo 3.1 (Google) — 12cr/s</option>
                <option value="veo-3.1-fast" className="bg-[#1a1a1a]">Veo 3.1 Fast — 6cr/s</option>
                <option value="wan-video" className="bg-[#1a1a1a]">WAN Video — 6cr/s (Fast)</option>
                <option value="kling-1.6" className="bg-[#1a1a1a]">Kling 1.6 — 6cr/s</option>
                <option value="kling-1.6-pro" className="bg-[#1a1a1a]">Kling 1.6 Pro — 6cr/s</option>
                <option value="minimax-video-fal" className="bg-[#1a1a1a]">Minimax — 6cr/s</option>
                <option value="luma-dream-machine" className="bg-[#1a1a1a]">Luma Dream — 6cr/s</option>
                <option value="hunyuan-video" className="bg-[#1a1a1a]">Hunyuan — 6cr/s</option>
                <option value="local-animatediff" className="bg-[#1a1a1a]">Local AnimateDiff (Free)</option>
              </select>

              <button
                onClick={triggerBatchVideos}
                disabled={nodeStats.videoRunning > 0}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nodeStats.videoRunning > 0 ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-[9px]"></i>
                    Generating ({nodeStats.videoRunning})
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bolt text-[9px]"></i>
                    Generate All Videos
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left sidebar — desktop: always visible, mobile: overlay drawer */}
        <div className="hidden md:block">
          <NodeSidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setShowMobileSidebar(false)}
            />
            <div className="fixed left-0 top-12 bottom-0 z-40 md:hidden animate-slide-in-left">
              <NodeSidebar />
            </div>
          </>
        )}

        {/* Canvas */}
        <StudioCanvas />

        {/* Right panel — output details (desktop only inline, mobile overlay) */}
        <div className="hidden md:block">
          {showOutput && <OutputPanel />}
        </div>
        {showOutput && (
          <div className="md:hidden fixed right-0 top-12 bottom-0 z-30">
            <div className="relative h-full">
              <OutputPanel />
              <button
                onClick={() => setShowOutput(false)}
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white/60 flex items-center justify-center z-10"
              >
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>
          </div>
        )}

        {/* Right panel — generation gallery (desktop only inline, mobile overlay) */}
        <div className="hidden md:block">
          {showGenerationGallery && (
            <GenerationGallery onClose={() => setShowGenerationGallery(false)} />
          )}
        </div>
        {showGenerationGallery && (
          <div className="md:hidden fixed right-0 top-12 bottom-0 z-30">
            <GenerationGallery onClose={() => setShowGenerationGallery(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
