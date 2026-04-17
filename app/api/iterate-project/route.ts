import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { generateApiEasyText } from '@/lib/api-easy-studio';
import {
  CREDIT_COSTS,
  PLAN_LIMITS,
  resetMonthlyCountsIfNeeded,
  type GenerationTracking,
} from '@/lib/subscription-plans';
import { isOwnerEmail } from '@/lib/owner-emails';
import { getFullAppTextModelCandidates, shouldTryNextFullAppModel } from '@/lib/full-app-api-models';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface IterationRequest {
  projectId: string;
  userId: string;
  prompt: string;
  targetFiles?: string[];
  currentState?: {
    files?: { [path: string]: string };
    designSystem?: any;
    appStructure?: any;
    componentTree?: any;
  };
}

interface FileChanges {
  modified: { [path: string]: string };
  added: { [path: string]: string };
  deleted: string[];
}

function estimateIterationCreditCost(prompt: string, currentState?: IterationRequest['currentState']): number {
  const base = CREDIT_COSTS.fullAppChat;
  const promptLen = Math.max(0, (prompt || '').length);
  const files = currentState?.files || {};
  const contextChars = Object.values(files).reduce((sum, content) => sum + String(content || '').length, 0);
  const promptSurcharge = Math.ceil(promptLen / 220);
  const contextSurcharge = Math.ceil(contextChars / 16000);
  return Math.max(base, base + promptSurcharge + contextSurcharge);
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, userId, prompt, targetFiles, currentState }: IterationRequest = await req.json();

    if (!projectId || !userId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, userId, prompt' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const userDoc = await ensureUserDocument(userId);
    const userRef = db.collection('users').doc(userId);
    const userData = userDoc.data();
    let generationTracking = (userData?.generationTracking || { projects: {} }) as GenerationTracking;

    let userEmail = (userData?.email as string) || '';
    if (!userEmail) {
      try {
        const authUser = await getAdminAuth().getUser(userId);
        userEmail = authUser.email || '';
      } catch { /* ignore */ }
    }
    const isOwner = isOwnerEmail(userEmail);
    const subscription = userData?.subscription || { plan: 'free', status: 'inactive' };
    if (!isOwner && (subscription.plan === 'free' || (subscription.status !== 'active' && subscription.plan !== 'tester'))) {
      return NextResponse.json(
        {
          error: 'Full app iterations require Basic ($25/mo) or higher with an active subscription.',
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // Same billing-cycle reset as Studio + generate-full-app — without this, stale creditsUsed blocks Premium users after a new period.
    const originalLastReset = String(generationTracking.lastResetDate || '');
    generationTracking = resetMonthlyCountsIfNeeded(generationTracking, subscription);
    if (generationTracking.lastResetDate !== originalLastReset) {
      await userRef.set(
        { generationTracking, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    }

    const project = generationTracking.projects?.[projectId];
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Credit check for this chat message (owner has unlimited)
    const creditCost = estimateIterationCreditCost(prompt, currentState);
    const creditsUsed = generationTracking.creditsUsed || 0;
    const customCreditsRaw = (subscription as { customStudioCredits?: unknown }).customStudioCredits;
    const customCredits =
      typeof customCreditsRaw === 'number' && Number.isFinite(customCreditsRaw) && customCreditsRaw > 0
        ? Math.floor(customCreditsRaw)
        : null;
    const planName = String(subscription.plan || 'free').toLowerCase().trim();
    const planCredits = PLAN_LIMITS[planName]?.credits ?? PLAN_LIMITS.free.credits;
    const creditsTotal = isOwner ? 999999 : (customCredits ?? planCredits);

    if (!isOwner && creditsUsed + creditCost > creditsTotal) {
      return NextResponse.json(
        {
          error: `Not enough credits. You have ${creditsTotal - creditsUsed} credits remaining (need ${creditCost}).`,
          creditsUsed,
          creditsTotal,
          creditsRemaining: creditsTotal - creditsUsed,
        },
        { status: 403 }
      );
    }

    // Use current files from client if provided (they may have accumulated changes)
    const projectFiles = currentState?.files || project.files;

    const changes = await generateFileChanges(projectFiles, project, prompt, targetFiles, currentState);

    // Apply changes
    const updatedFiles = { ...projectFiles };
    Object.entries(changes.modified).forEach(([path, content]) => {
      updatedFiles[path] = content;
    });
    Object.entries(changes.added).forEach(([path, content]) => {
      updatedFiles[path] = content;
    });
    changes.deleted.forEach(path => {
      delete updatedFiles[path];
    });

    const iterationCount = (project.iterationCount || 0) + 1;

    const updatedProject = {
      ...project,
      files: updatedFiles,
      iterationCount,
      lastModified: new Date().toISOString(),
      iterationHistory: [
        ...(project.iterationHistory || []).slice(-20),
        {
          timestamp: new Date().toISOString(),
          changes,
          description: prompt,
        },
      ],
    };

    generationTracking.projects[projectId] = updatedProject;
    if (!isOwner) generationTracking.creditsUsed = creditsUsed + creditCost;

    await userRef.set({
      generationTracking,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      changes,
      iterationCount,
      creditsUsed: generationTracking.creditsUsed,
      creditsTotal,
      creditsRemaining: creditsTotal - generationTracking.creditsUsed,
      creditCost,
      project: {
        id: projectId,
        name: updatedProject.projectName,
        iterationCount: updatedProject.iterationCount,
        lastModified: updatedProject.lastModified,
      },
    });

  } catch (error: any) {
    console.error('Iteration error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to iterate project' },
      { status: 500 }
    );
  }
}

async function generateFileChanges(
  currentFiles: { [path: string]: string },
  project: any,
  prompt: string,
  targetFiles?: string[],
  currentState?: any
): Promise<FileChanges> {
  // Build compact file listing (full content for small files, summary for large ones)
  const fileListings: string[] = [];
  const allPaths = Object.keys(currentFiles);
  
  for (const path of allPaths) {
    const content = currentFiles[path];
    if (content.length < 3000) {
      fileListings.push(`--- ${path} ---\n${content}`);
    } else {
      // For large files, include first/last 800 chars
      fileListings.push(`--- ${path} (${content.length} chars) ---\n${content.slice(0, 800)}\n...[truncated]...\n${content.slice(-800)}`);
    }
  }

  // If target files specified, include their full content
  if (targetFiles?.length) {
    for (const tf of targetFiles) {
      if (currentFiles[tf] && currentFiles[tf].length >= 3000) {
        const idx = fileListings.findIndex(l => l.startsWith(`--- ${tf}`));
        if (idx >= 0) {
          fileListings[idx] = `--- ${tf} ---\n${currentFiles[tf]}`;
        }
      }
    }
  }

  const projectContext = `You are modifying an existing ${project.framework || 'Next.js'} project. Maintain Lovable/Replit quality: professional UI, real functionality, no AI slop.

EXISTING PROJECT FILES:
${fileListings.join('\n\n')}

USER REQUEST: ${prompt}
${targetFiles ? `\nFOCUS ON THESE FILES: ${targetFiles.join(', ')}` : ''}

RULES:
0. Implement the user request exactly and preserve user-provided business details, names, pricing, contact info, and tone unless they explicitly ask to remove/change them. This means you must modify the EXISTING UI code from the frontend manually built by the user/system.
1. Only return files that ACTUALLY NEED TO CHANGE based on the user's request
2. Do NOT regenerate unchanged files — this wastes tokens and breaks things
3. For modified files, return the COMPLETE updated file content (not patches)
4. For new files, provide full content
5. Maintain existing design patterns, imports, and architecture
6. All imports must resolve to existing files in the project
7. If adding a new component, also update any files that need to import it
8. If adding CRUD/data: create app/api/[resource]/route.js + update lib/data.js + lib/api.js
9. Keep professional UI: loading states, error handling, micro-interactions

Return ONLY valid JSON with this structure:
{
  "modified": {
    "path/to/file.tsx": "complete updated file content"
  },
  "added": {
    "path/to/new-file.tsx": "complete new file content"
  },
  "deleted": ["path/to/removed-file.tsx"]
}

CRITICAL: Return ONLY the JSON object. No markdown, no explanations, no backticks.`;

  let lastError: unknown = null;
  const modelsToTry = getFullAppTextModelCandidates();
  if (!modelsToTry.length) {
    throw new Error('No text models configured for project iteration.');
  }

  for (const modelName of modelsToTry) {
    try {
      console.log(`Iterating project with ${modelName}`);
      let text = await generateApiEasyText({
        prompt: projectContext,
        model: modelName,
        maxTokens: 40000,
        temperature: 0.7,
      });

      text = (text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      let changes: FileChanges;
      try {
        changes = JSON.parse(text);
      } catch {
        throw new Error('Could not parse model response. Please try describing your changes more clearly.');
      }
      if (!changes?.modified && !changes?.added && !changes?.deleted) {
        throw new Error('Model did not return valid changes. Please try again.');
      }
      return changes;
    } catch (error: unknown) {
      const msg = String((error as { message?: string })?.message || error || '');
      console.error(`Model ${modelName} failed for iteration:`, msg);
      lastError = error;
      if (shouldTryNextFullAppModel(error)) {
        continue;
      }
      throw error instanceof Error ? error : new Error(msg || 'Iteration failed');
    }
  }

  const lastMsg = String((lastError as { message?: string })?.message || lastError || 'Unknown error');
  throw new Error(`All models failed (tried ${modelsToTry.join(', ')}). Last error: ${lastMsg}`);
}
