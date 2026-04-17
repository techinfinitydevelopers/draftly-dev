import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, authErrorResponse, AuthError } from '@/lib/verify-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { isDeveloperDashboardOperator } from '@/lib/developer-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_USERS = 120;
const MAX_3D_PROJECTS = 8;
const MAX_INTEGRATIONS = 24;

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const email = auth.email;
    if (!isDeveloperDashboardOperator(email)) {
      return NextResponse.json({ error: 'Developer access only' }, { status: 403 });
    }

    const db = getAdminDb();
    let snap;
    try {
      snap = await db.collection('users').orderBy('updatedAt', 'desc').limit(MAX_USERS).get();
    } catch {
      snap = await db.collection('users').limit(MAX_USERS).get();
    }

    const rows: unknown[] = [];

    for (const doc of snap.docs) {
      const uid = doc.id;
      const d = doc.data() as Record<string, unknown>;
      const subscription = (d.subscription || {}) as Record<string, unknown>;
      const gen = (d.generationTracking || {}) as Record<string, unknown>;
      const projects = (gen.projects || {}) as Record<string, unknown>;
      const activity = (d.activity || {}) as Record<string, unknown>;

      const lastSeen = activity.lastSeenAt;
      let lastSeenIso: string | null = null;
      try {
        if (lastSeen && typeof (lastSeen as { toDate?: () => Date }).toDate === 'function') {
          lastSeenIso = (lastSeen as { toDate: () => Date }).toDate().toISOString();
        }
      } catch {
        /* ignore */
      }

      const projects3d: Array<{
        id: string;
        name: string;
        sitePrompt: string;
        bgPrompt: string;
        updatedAt: number;
        userPromptSnippets: string[];
        hasSiteCode: boolean;
        buildTarget: string;
      }> = [];

      try {
        let pq = db.collection('users').doc(uid).collection('3dProjects').orderBy('updatedAt', 'desc').limit(MAX_3D_PROJECTS);
        let psnap = await pq.get();
        if (psnap.empty) {
          psnap = await db.collection('users').doc(uid).collection('3dProjects').limit(MAX_3D_PROJECTS).get();
        }
        for (const p of psnap.docs) {
          const pd = p.data() as Record<string, unknown>;
          const messages = Array.isArray(pd.messages) ? pd.messages : [];
          const userTexts = messages
            .filter((m: unknown) => (m as { role?: string }).role === 'user')
            .map((m: unknown) => String((m as { text?: string }).text || '').slice(0, 280))
            .filter(Boolean)
            .slice(-5);
          projects3d.push({
            id: p.id,
            name: str(pd.name) || p.id,
            sitePrompt: String(pd.sitePrompt || '').slice(0, 500),
            bgPrompt: String(pd.bgPrompt || '').slice(0, 400),
            updatedAt: num(pd.updatedAt),
            userPromptSnippets: userTexts,
            hasSiteCode: Boolean(pd.siteCodePath),
            buildTarget: String(pd.buildTarget || 'desktop'),
          });
        }
      } catch {
        /* subcollection rules or index */
      }

      const integrations: Array<{ id: string; status: string }> = [];
      try {
        const isnap = await db.collection('users').doc(uid).collection('integrations').limit(MAX_INTEGRATIONS).get();
        for (const idoc of isnap.docs) {
          const idata = idoc.data() as Record<string, unknown>;
          const st = idata.status === 'connected' ? 'connected' : idata.status === 'error' ? 'error' : 'not_connected';
          integrations.push({ id: idoc.id, status: st });
        }
      } catch {
        /* ignore */
      }

      rows.push({
        uid,
        email: str(d.email) || null,
        plan: str(subscription.plan) || 'free',
        subscriptionStatus: str(subscription.status) || 'unknown',
        createdAt: str(d.createdAt) || null,
        updatedAt: str(d.updatedAt) || null,
        onboardingComplete: Boolean(d.onboardingComplete),
        activity: {
          lastSeenAt: lastSeenIso,
          sessionCount: num(activity.sessionCount),
        },
        generation: {
          creditsUsed: num(gen.creditsUsed),
          chatsUsed: num(gen.chatsUsed),
          sites3DGenerated: num(gen.sites3DGenerated),
          fullAppsGenerated: num(gen.fullAppsGenerated),
          uiPreviewsGenerated: num(gen.uiPreviewsGenerated),
          studioImageGenerations: num(gen.studioImageGenerations),
          studioVideoGenerations: num(gen.studioVideoGenerations),
          lastResetDate: str(gen.lastResetDate),
        },
        fullAppProjectCount: Object.keys(projects).length,
        projects3d,
        integrations,
      });
    }

    const withEmail = rows.filter((r) => (r as { email?: string | null }).email);
    const bySessions = [...withEmail].sort(
      (a, b) =>
        (b as { activity: { sessionCount: number } }).activity.sessionCount -
        (a as { activity: { sessionCount: number } }).activity.sessionCount,
    );
    const byCredits = [...withEmail].sort(
      (a, b) =>
        (b as { generation: { creditsUsed: number } }).generation.creditsUsed -
        (a as { generation: { creditsUsed: number } }).generation.creditsUsed,
    );

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      userCount: rows.length,
      users: rows,
      highlights: {
        mostSessions: bySessions.slice(0, 8).map((u) => ({
          email: (u as { email: string }).email,
          sessions: (u as { activity: { sessionCount: number } }).activity.sessionCount,
        })),
        leastSessions: [...bySessions].reverse().slice(0, 8).map((u) => ({
          email: (u as { email: string }).email,
          sessions: (u as { activity: { sessionCount: number } }).activity.sessionCount,
        })),
        topCredits: byCredits.slice(0, 8).map((u) => ({
          email: (u as { email: string }).email,
          creditsUsed: (u as { generation: { creditsUsed: number } }).generation.creditsUsed,
        })),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return authErrorResponse(e);
    console.error('[developer-snapshot]', e);
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 });
  }
}
