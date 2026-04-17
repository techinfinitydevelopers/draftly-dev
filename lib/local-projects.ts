/**
 * Local Storage utility for storing projects on the client side
 */

import { devError } from '@/lib/client-log';

const PROJECTS_KEY = 'draftly_projects';

export interface LocalProject {
  id: string;
  prompt: string;
  fullPrompt?: string;
  theme?: string;
  colorScheme?: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  previewImage?: string; // Base64 thumbnail
}

/**
 * Get all projects from localStorage
 */
export function getLocalProjects(): LocalProject[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    devError('Error reading projects from localStorage', error);
    return [];
  }
}

/**
 * Save a new project to localStorage
 */
export function saveLocalProject(project: Omit<LocalProject, 'id' | 'createdAt' | 'updatedAt'>): LocalProject {
  const projects = getLocalProjects();
  
  const newProject: LocalProject = {
    ...project,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  projects.unshift(newProject); // Add to beginning
  
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    devError('Error saving project to localStorage', error);
    // If storage is full, try removing old projects
    if (projects.length > 50) {
      const trimmed = projects.slice(0, 30);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(trimmed));
    }
  }
  
  return newProject;
}

/**
 * Update an existing project
 */
export function updateLocalProject(id: string, updates: Partial<LocalProject>): LocalProject | null {
  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return projects[index];
}

/**
 * Get a single project by ID
 */
export function getLocalProject(id: string): LocalProject | null {
  const projects = getLocalProjects();
  return projects.find(p => p.id === id) || null;
}

/**
 * Delete a project
 */
export function deleteLocalProject(id: string): boolean {
  const projects = getLocalProjects();
  const filtered = projects.filter(p => p.id !== id);
  
  if (filtered.length === projects.length) return false;
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Clear all projects
 */
export function clearLocalProjects(): void {
  localStorage.removeItem(PROJECTS_KEY);
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export projects as JSON file
 */
export function exportProjects(): void {
  const projects = getLocalProjects();
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `draftly-projects-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import projects from JSON file
 */
export function importProjects(jsonString: string): number {
  try {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) throw new Error('Invalid format');
    
    const existing = getLocalProjects();
    const existingIds = new Set(existing.map(p => p.id));
    
    // Add only new projects
    let addedCount = 0;
    for (const project of imported) {
      if (!existingIds.has(project.id)) {
        existing.push(project);
        addedCount++;
      }
    }
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(existing));
    return addedCount;
  } catch (error) {
    devError('Error importing projects', error);
    return 0;
  }
}
