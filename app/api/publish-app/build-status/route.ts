import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/publish-app/build-status?runId=123&userId=xxx&projectId=yyy
 * Polls GitHub Actions run. When complete, downloads artifacts, re-uploads to Firebase Storage,
 * returns signed download URLs for .aab and .ipa.
 */
export async function GET(req: NextRequest) {
  try {
    const runId = req.nextUrl.searchParams.get('runId');
    const userId = req.nextUrl.searchParams.get('userId');
    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!runId || !userId || !projectId) {
      return NextResponse.json(
        { error: 'runId, userId, and projectId required' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    if (!githubToken || !githubRepo) {
      return NextResponse.json({ error: 'Build pipeline not configured' }, { status: 503 });
    }

    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    const runRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    if (!runRes.ok) {
      const err = await runRes.text();
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }
    const run = await runRes.json();
    const status = run.status;
    const conclusion = run.conclusion;

    if (status !== 'completed') {
      return NextResponse.json({
        status: status === 'in_progress' ? 'in_progress' : 'queued',
        conclusion: null,
      });
    }

    if (conclusion !== 'success') {
      return NextResponse.json({
        status: 'completed',
        conclusion: conclusion || 'failure',
        error: run.conclusion === 'failure' ? 'Build failed. Check GitHub Actions logs.' : undefined,
      });
    }

    const artifactsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    if (!artifactsRes.ok) {
      return NextResponse.json({
        status: 'completed',
        conclusion: 'success',
        error: 'Could not list artifacts',
      });
    }
    const artifactsData = await artifactsRes.json();
    const artifacts = artifactsData.artifacts || [];
    const androidArtifact = artifacts.find((a: { name: string }) => a.name === 'android-aab' || a.name === 'android');
    const iosArtifact = artifacts.find((a: { name: string }) => a.name === 'ios-ipa' || a.name === 'ios');

    const bucket = getAdminStorage().bucket();
    const basePath = `builds/${userId}/${projectId}/artifacts`;
    let androidUrl: string | null = null;
    let iosUrl: string | null = null;
    const expires = Date.now() + 24 * 60 * 60 * 1000;

    const downloadAndReupload = async (artifact: { id: number; name: string }, ext: string): Promise<string | null> => {
      const zipRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifact.id}/zip`,
        {
          headers: { Authorization: `Bearer ${githubToken}` },
        }
      );
      if (!zipRes.ok) return null;
      const zipBuf = Buffer.from(await zipRes.arrayBuffer());
      const zip = await JSZip.loadAsync(zipBuf);
      const names = Object.keys(zip.files).filter((n) => n.endsWith(ext));
      const entry = names[0] ? zip.files[names[0]] : null;
      if (!entry || entry.dir) return null;
      const content = await entry.async('nodebuffer');
      const destPath = `${basePath}/${artifact.name}-${Date.now()}${ext}`;
      const file = bucket.file(destPath);
      await file.save(content, {
        metadata: { contentType: ext === '.aab' ? 'application/x-authorization-bundle' : 'application/octet-stream' },
        resumable: false,
      });
      const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires });
      return url;
    };

    if (androidArtifact) {
      androidUrl = await downloadAndReupload(androidArtifact, '.aab');
    }
    if (iosArtifact) {
      iosUrl = await downloadAndReupload(iosArtifact, '.ipa');
    }

    return NextResponse.json({
      status: 'completed',
      conclusion: 'success',
      androidUrl,
      iosUrl,
    });
  } catch (e: any) {
    console.error('build-status error', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to get build status' },
      { status: 500 }
    );
  }
}
