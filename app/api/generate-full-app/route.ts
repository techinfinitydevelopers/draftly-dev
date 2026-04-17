import { NextRequest, NextResponse } from 'next/server';
import { generateFullApp, GeneratedProject } from '@/lib/generate-full-app';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { canGenerateFullApp, resetMonthlyCountsIfNeeded, PLAN_LIMITS } from '@/lib/subscription-plans';
import { planCanExportZip } from '@/lib/plan-entitlements';
import { isOwnerEmail } from '@/lib/owner-emails';
import { getCapacitorConfigJson, getMobilePublishingReadme, ensureNextStaticExport } from '@/lib/mobile-export';
import JSZip from 'jszip';
import { buildEnvExampleFromKitsAndExistingKeys, buildKitFiles, type IntegrationKitId } from '@/lib/integration-kits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      framework = 'nextjs', 
      projectName = 'my-app',
      outputFormat = 'zip', // 'zip' or 'json'
      userId,
      requirements, // Full requirements object
      customApiKey,
      theme, // Theme ID
      colorScheme, // Color scheme ID
      projectId: existingProjectId, // For downloading existing project
      exportForMobile = false, // Add Capacitor config + static export for App Store / Play Store
    } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // If downloading existing project, prompt is not required
    const promptStr = typeof prompt === 'string' ? prompt.trim() : '';
    let composedPrompt = promptStr;
    if (requirements != null && typeof requirements === 'object' && !Array.isArray(requirements)) {
      try {
        composedPrompt += `\n\n─── Structured requirements (implement every applicable item) ───\n${JSON.stringify(requirements, null, 2)}`;
      } catch {
        composedPrompt += `\n\n─── Structured requirements ───\n${String(requirements)}`;
      }
    }
    if (!existingProjectId && !composedPrompt) {
      return NextResponse.json(
        { error: 'Invalid prompt' },
        { status: 400 }
      );
    }

    // Ensure user doc exists (create with free defaults if first time)
    const userDoc = await ensureUserDocument(userId);
    const userData = userDoc.data();
    const userRef = getAdminDb().collection('users').doc(userId);
    const subscription = userData?.subscription || {
      plan: 'free',
      status: 'inactive',
    };

    // Get or initialize generation tracking
    let generationTracking = userData?.generationTracking || {
      fullAppsGenerated: 0,
      uiPreviewsGenerated: 0,
      lastResetDate: new Date().toISOString(),
      projects: {},
    };

    // Reset monthly counts if needed (billing cycle)
    const originalLastReset = (userData?.generationTracking?.lastResetDate as string) || '';
    generationTracking = resetMonthlyCountsIfNeeded(generationTracking, subscription);
    // Persist reset so frontend Firestore listener gets updated limits (fixes stale "limit reached" for new billing cycle)
    if (generationTracking.lastResetDate !== originalLastReset) {
      await userRef.set({
        generationTracking,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    let userEmail = (userData?.email as string) || '';
    if (!userEmail) {
      try {
        const authUser = await getAdminAuth().getUser(userId);
        userEmail = authUser.email || '';
      } catch { /* ignore */ }
    }
    const isOwner = isOwnerEmail(userEmail);

    // Check if user can generate full app (owner has unlimited)
    const canGenerate = isOwner ? { allowed: true } : canGenerateFullApp(subscription, generationTracking);
    if (!canGenerate.allowed) {
      return NextResponse.json(
        { 
          error: canGenerate.reason || 'Full app generation not allowed',
          requiresUpgrade: true,
          currentPlan: subscription.plan,
        },
        { status: 403 }
      );
    }

    if (outputFormat === 'zip') {
      const zipOk = planCanExportZip(String(subscription.plan || 'free'), { isOwner });
      if (!zipOk) {
        return NextResponse.json(
          {
            error: 'ZIP export requires Premium ($200/mo) or higher.',
            requiresUpgrade: true,
            minPlan: 'premium',
            currentPlan: subscription.plan,
          },
          { status: 403 },
        );
      }
    }

    // If existingProjectId provided and outputFormat is zip, return existing project as ZIP
    if (existingProjectId && outputFormat === 'zip') {
      const existingProject = generationTracking.projects?.[existingProjectId];
      
      if (!existingProject) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Generate ZIP from existing project
      const zip = new JSZip();
      const projectNameForZip = existingProject.projectName || 'project';
      for (const [path, content] of Object.entries(existingProject.files)) {
        let contentToWrite = content as string;
        if (exportForMobile && path === 'next.config.js') {
          contentToWrite = ensureNextStaticExport(contentToWrite);
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
      if (exportForMobile) {
        zip.file('capacitor.config.json', getCapacitorConfigJson(projectNameForZip));
        zip.file('MOBILE-PUBLISHING.md', getMobilePublishingReadme(projectNameForZip));
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      const uint8Array = new Uint8Array(zipBuffer);
      const arrayBuffer = uint8Array.buffer.slice(
        uint8Array.byteOffset,
        uint8Array.byteOffset + uint8Array.byteLength
      );

      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${projectNameForZip}${exportForMobile ? '-mobile' : ''}.zip"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      });
    }

    console.log('Generating full app:', { promptLen: composedPrompt.length, framework, projectName, userId, theme, colorScheme });

    // Generate the full app structure with theme/color support
    const project: GeneratedProject = await generateFullApp(
      composedPrompt,
      framework as any,
      projectName,
      customApiKey,
      theme,
      colorScheme
    );

    console.log(`Generated ${project.files.length} files`);

    // ── Integration Kits: scaffold placeholders into generated projects ──
    const enabledKits: IntegrationKitId[] = Array.isArray((userData as any)?.enabledKits)
      ? ((userData as any).enabledKits as IntegrationKitId[])
      : [];
    const envVars = ((userData as any)?.envVars || {}) as Record<string, string>;
    const envExample = buildEnvExampleFromKitsAndExistingKeys({
      kits: enabledKits,
      existingEnvKeys: Object.keys(envVars || {}),
    });
    const kitFiles = buildKitFiles(enabledKits, {
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    });

    project.files.push({ path: '.env.example', content: envExample, type: 'file' });
    project.files.push({
      path: 'INTEGRATIONS.md',
      type: 'file',
      content:
        `# Integration Kits\n\n` +
        `This project was scaffolded with Draftly Integration Kits.\n\n` +
        `Enabled kits: ${enabledKits.length ? enabledKits.join(', ') : '(none)'}\n\n` +
        `## How to use\n` +
        `1. Copy \`.env.example\` → \`.env.local\` (or provider secrets)\n` +
        `2. Fill in values for the integrations you enabled\n` +
        `3. Deploy (Vercel/etc.) or run locally\n\n` +
        `Kits add safe placeholders only — you own the keys.\n`,
    });
    for (const [path, content] of Object.entries(kitFiles)) {
      project.files.push({ path, content, type: 'file' });
    }
    // Create project ID (only if not provided - for new projects)
    const projectId = existingProjectId || `app_${Date.now()}`;

    // Store project in generation tracking
    const projectFiles: { [path: string]: string } = {};
    project.files.forEach(file => {
      projectFiles[file.path] = file.content;
    });

    // Generate design system if theme/color provided
    let designSystem = null;
    if (theme && colorScheme) {
      const { generateDesignSystem } = await import('@/lib/design-system');
      designSystem = generateDesignSystem(theme, colorScheme);
    }

    generationTracking.projects[projectId] = {
      projectId,
      projectName,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      files: projectFiles,
      framework: project.framework,
      status: 'active',
      designSystem,
      theme,
      colorScheme,
    };

    // Store project first (before incrementing count for preview)
    await userRef.set({
      generationTracking,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Get plan limits for response (includes all paid tiers)
    const plan = String(subscription.plan || 'free') as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // If JSON format requested, return the project structure for preview
    // Don't increment count yet - only increment when user actually downloads
    if (outputFormat === 'json') {
      return NextResponse.json({
        success: true,
        projectId,
        project: {
          id: projectId,
          name: projectName,
          framework: project.framework,
          files: projectFiles, // Return as object for easier access
          fileCount: project.files.length,
          createdAt: new Date().toISOString(),
          designSystem: generationTracking.projects[projectId]?.designSystem,
          theme,
          colorScheme,
        },
        generationTracking: {
          fullAppsRemaining: limits.fullAppGenerations > 0 
            ? Math.max(0, limits.fullAppGenerations - (generationTracking.fullAppsGenerated || 0))
            : -1,
        },
      });
    }

    // For ZIP download, increment the count
    generationTracking.fullAppsGenerated = (generationTracking.fullAppsGenerated || 0) + 1;

    // Update user document with incremented count
    await userRef.set({
      generationTracking,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Generate ZIP file
    const zip = new JSZip();

    for (const file of project.files) {
      let contentToWrite = file.content;
      if (exportForMobile && file.path === 'next.config.js') {
        contentToWrite = ensureNextStaticExport(contentToWrite);
      }
      const pathParts = file.path.split('/');
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
    if (exportForMobile) {
      zip.file('capacitor.config.json', getCapacitorConfigJson(projectName));
      zip.file('MOBILE-PUBLISHING.md', getMobilePublishingReadme(projectName));
    }

    // Generate ZIP buffer as nodebuffer (Buffer type)
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    // Convert Buffer to Uint8Array, then to ArrayBuffer
    // This ensures compatibility with NextResponse
    const uint8Array = new Uint8Array(zipBuffer);
    const arrayBuffer = uint8Array.buffer.slice(
      uint8Array.byteOffset,
      uint8Array.byteOffset + uint8Array.byteLength
    );

    // Return ZIP file
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${projectName}${exportForMobile ? '-mobile' : ''}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Full app generation error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to generate full app',
      },
      { status: 500 }
    );
  }
}

