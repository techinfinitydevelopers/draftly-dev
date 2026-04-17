/**
 * Publish as App — build the Capacitor-ready project ZIP for store builds.
 * Used by: prepare (download), trigger-build (upload to storage for CI).
 */

import JSZip from 'jszip';
import {
  getCapacitorConfigJson,
  getMobilePublishingReadme,
  ensureNextStaticExport,
} from './mobile-export';

export interface ProjectData {
  projectId: string;
  projectName: string;
  framework: string;
  files: { [path: string]: string };
}

/**
 * Ensure package.json includes Capacitor dependencies so CI can run cap add.
 */
function ensureCapacitorDeps(packageJsonContent: string): string {
  try {
    const pkg = JSON.parse(packageJsonContent) as Record<string, unknown>;
    const deps = (pkg.dependencies as Record<string, string>) || {};
    if (!deps['@capacitor/core']) deps['@capacitor/core'] = '^6.0.0';
    if (!deps['@capacitor/cli']) deps['@capacitor/cli'] = '^6.0.0';
    pkg.dependencies = deps;
    return JSON.stringify(pkg, null, 2);
  } catch {
    return packageJsonContent;
  }
}

/**
 * Build the full Capacitor-ready project as a ZIP buffer.
 * Includes: user files (with next static export), capacitor.config, package.json with Capacitor, README.
 */
export async function buildPublishAppZip(project: ProjectData): Promise<Buffer> {
  const zip = new JSZip();
  const projectName = project.projectName || 'my-app';

  for (const [path, content] of Object.entries(project.files)) {
    let contentToWrite = content;
    if (path === 'next.config.js') {
      contentToWrite = ensureNextStaticExport(content);
    }
    if (path === 'package.json') {
      contentToWrite = ensureCapacitorDeps(content);
    }
    const pathParts = path.split('/');
    let currentFolder = zip;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i];
      if (!currentFolder.folder(folderName)) {
        currentFolder = currentFolder.folder(folderName)!;
      } else {
        currentFolder = currentFolder.folder(folderName)!;
      }
    }
    const fileName = pathParts[pathParts.length - 1];
    currentFolder.file(fileName, contentToWrite);
  }

  zip.file('capacitor.config.json', getCapacitorConfigJson(projectName));
  zip.file('MOBILE-PUBLISHING.md', getMobilePublishingReadme(projectName));

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return zipBuffer as Buffer;
}
