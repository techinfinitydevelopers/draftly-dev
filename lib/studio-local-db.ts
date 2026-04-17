/**
 * studio-local-db.ts — IndexedDB persistence for Studio workflows.
 *
 * All workflow data (nodes, edges, images, videos) is stored entirely
 * on the user's device via IndexedDB. No Firebase Storage needed.
 * IndexedDB can hold hundreds of MBs — far beyond localStorage's 5 MB cap.
 */

const DB_NAME = 'draftly-studio';
const DB_VERSION = 1;
const STORE_WORKFLOWS = 'workflows';
const LS_WORKFLOW_KEY = 'draftly-studio-workflows-v1';

export interface LocalWorkflow {
  id: string;
  userId: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

// ── Open (or create) the database ─────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_WORKFLOWS)) {
        const store = db.createObjectStore(STORE_WORKFLOWS, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readLocalFallback(): LocalWorkflow[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_WORKFLOW_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalWorkflow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(items: LocalWorkflow[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS_WORKFLOW_KEY, JSON.stringify(items));
}

// ── Save / update a workflow ──────────────────────────────────────────

export async function saveWorkflowLocal(
  workflow: LocalWorkflow,
): Promise<string> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORKFLOWS, 'readwrite');
      const store = tx.objectStore(STORE_WORKFLOWS);
      store.put(workflow);
      tx.oncomplete = () => resolve(workflow.id);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const all = readLocalFallback();
    const idx = all.findIndex((w) => w.id === workflow.id);
    if (idx >= 0) all[idx] = workflow;
    else all.push(workflow);
    writeLocalFallback(all);
    return workflow.id;
  }
}

// ── Load a single workflow ────────────────────────────────────────────

export async function loadWorkflowLocal(
  workflowId: string,
): Promise<LocalWorkflow | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORKFLOWS, 'readonly');
      const store = tx.objectStore(STORE_WORKFLOWS);
      const req = store.get(workflowId);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const all = readLocalFallback();
    return all.find((w) => w.id === workflowId) || null;
  }
}

// ── List all workflows for a user (sorted by updatedAt desc) ──────────

export async function listWorkflowsLocal(
  userId: string,
): Promise<LocalWorkflow[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORKFLOWS, 'readonly');
      const store = tx.objectStore(STORE_WORKFLOWS);
      const index = store.index('userId');
      const req = index.getAll(userId);

      req.onsuccess = () => {
        const results = (req.result as LocalWorkflow[]) || [];
        // Sort by updatedAt descending
        results.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const all = readLocalFallback().filter((w) => w.userId === userId);
    all.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return all;
  }
}

// ── Delete a workflow ─────────────────────────────────────────────────

export async function deleteWorkflowLocal(
  workflowId: string,
): Promise<void> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORKFLOWS, 'readwrite');
      const store = tx.objectStore(STORE_WORKFLOWS);
      store.delete(workflowId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const all = readLocalFallback().filter((w) => w.id !== workflowId);
    writeLocalFallback(all);
  }
}

// ── Generate a unique ID ──────────────────────────────────────────────

export function generateLocalId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
