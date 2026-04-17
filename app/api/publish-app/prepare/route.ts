import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { ensureUserDocument } from '@/lib/ensure-user-doc';
import { buildPublishAppZip } from '@/lib/publish-app';
import { canGenerateFullApp, resetMonthlyCountsIfNeeded } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/publish-app/prepare
 * Body: { projectId, userId }
 * Returns: ZIP of Capacitor-ready project (website + config for App Store / Play Store).
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, userId } = await req.json();
    if (!userId || !projectId) {
      return NextResponse.json({ error: 'projectId and userId required' }, { status: 400 });
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

    const filename = `${(project.projectName || 'app').replace(/\s+/g, '-')}-publish-app.zip`;
    const uint8Array = new Uint8Array(zipBuffer);
    const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (e: any) {
    console.error('publish-app prepare error', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to prepare project' },
      { status: 500 }
    );
  }
}
