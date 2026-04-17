import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { buildPublishAppZip } from '@/lib/publish-app';
import { canGenerateFullApp, resetMonthlyCountsIfNeeded } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WORKFLOW_FILE = 'build-apps.yml';

/**
 * POST /api/publish-app/trigger-build
 * Body: { projectId, userId }
 * 1. Build Capacitor project ZIP
 * 2. Upload to Firebase Storage
 * 3. Trigger GitHub Actions workflow_dispatch with zip_url
 * 4. Return runId so client can poll build-status
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, userId } = await req.json();
    if (!userId || !projectId) {
      return NextResponse.json({ error: 'projectId and userId required' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO; // e.g. "owner/repo"
    if (!githubToken || !githubRepo) {
      return NextResponse.json(
        {
          error: 'Build pipeline not configured',
          hint: 'Set GITHUB_TOKEN and GITHUB_REPO. Use "Download prepared project" to build locally.',
        },
        { status: 503 }
      );
    }

    const db = getAdminDb();
    const userDoc = await ensureUserDocument(userId);
    const userData = userDoc.data();
    let generationTracking = userData?.generationTracking || { projects: {} };
    generationTracking = resetMonthlyCountsIfNeeded(generationTracking);
    const canGenerate = canGenerateFullApp(userData?.subscription || {}, generationTracking);
    if (!canGenerate.allowed) {
      return NextResponse.json(
        { error: canGenerate.reason || 'Not allowed', requiresUpgrade: true },
        { status: 403 }
      );
    }

    const project = generationTracking.projects[projectId];
    if (!project?.files) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const zipBuffer = await buildPublishAppZip({
      projectId,
      projectName: project.projectName || 'my-app',
      framework: project.framework || 'nextjs',
      files: project.files,
    });

    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const timestamp = Date.now();
    const storagePath = `builds/${userId}/${projectId}/${timestamp}.zip`;
    const file = bucket.file(storagePath);
    await file.save(zipBuffer, {
      metadata: { contentType: 'application/zip' },
      resumable: false,
    });

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 2 * 60 * 60 * 1000, // 2 hours for CI to download
    });

    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    const triggerRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: process.env.GITHUB_BUILD_REF || 'main',
          inputs: {
            zip_url: signedUrl,
            project_id: projectId,
            project_name: (project.projectName || 'app').replace(/\s+/g, '-'),
          },
        }),
      }
    );

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      console.error('GitHub workflow_dispatch failed', triggerRes.status, errText);
      return NextResponse.json(
        { error: 'Failed to start build', details: errText },
        { status: 502 }
      );
    }

    // Get the created run ID (workflow_dispatch doesn't return it; we list recent runs)
    await new Promise((r) => setTimeout(r, 2000));
    const runsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    if (!runsRes.ok) {
      return NextResponse.json({
        runId: null,
        status: 'triggered',
        message: 'Build queued. Check your GitHub Actions tab for status.',
      });
    }
    const runsData = await runsRes.json();
    const run = runsData.workflow_runs?.[0];
    const runId = run?.id ?? null;

    return NextResponse.json({
      runId,
      status: 'queued',
      statusUrl: run?.html_url || null,
      message: 'Build started. Use "Check build status" to get download links when ready.',
    });
  } catch (e: any) {
    console.error('publish-app trigger-build error', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to trigger build' },
      { status: 500 }
    );
  }
}
