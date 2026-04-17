import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/verify-auth';
import { buildEnvExampleFromKitsAndExistingKeys, buildKitFiles, type IntegrationKitId } from '@/lib/integration-kits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { code, frames, projectName = 'my-3d-website' } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        console.log('📦 3D Builder: Bundling ZIP...');
        console.log(`   Frames: ${frames?.length || 0}`);

        const zip = new JSZip();

        // Add the main HTML file
        zip.file('index.html', code);

        // Integration kits scaffolding (optional; based on user profile)
        try {
          const auth = await verifyAuth(req);
          const db = getAdminDb();
          const doc = await db.collection('users').doc(auth.uid).get();
          const d = doc.data() || {};
          const enabledKits: IntegrationKitId[] = Array.isArray((d as any).enabledKits) ? (d as any).enabledKits : [];
          const envKeys = Object.keys(((d as any).envVars || {}) as Record<string, string>);
          const envExample = buildEnvExampleFromKitsAndExistingKeys({ kits: enabledKits, existingEnvKeys: envKeys });
          zip.file('.env.example', envExample);
          zip.file('INTEGRATIONS.md', `Enabled kits: ${enabledKits.length ? enabledKits.join(', ') : '(none)'}\n\nCopy .env.example → .env.local and fill your own keys.\n`);
          const kitFiles = buildKitFiles(enabledKits, { appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' });
          const kitFolder = zip.folder('INTEGRATIONS')!;
          for (const [path, content] of Object.entries(kitFiles)) {
            // Put kit docs under INTEGRATIONS/ for clarity.
            kitFolder.file(path.replace(/^INTEGRATIONS\//, ''), content);
          }
        } catch {
          // If unauthenticated, just produce the basic ZIP.
        }
        // Add frames to frames-webp folder
        if (frames && Array.isArray(frames)) {
            const framesFolder = zip.folder('frames-webp')!;
            for (let i = 0; i < frames.length; i++) {
                const frameData = frames[i];
                // frames come as base64 data URIs: "data:image/webp;base64,..."
                const base64Data = frameData.replace(/^data:image\/\w+;base64,/, '');
                const fileName = `frame_${String(i + 1).padStart(6, '0')}.webp`;
                framesFolder.file(fileName, base64Data, { base64: true });
            }
        }

        // Add a README
        zip.file('README.md', `# ${projectName}

A scroll-driven 3D animated website built with Draftly.

## How to Use
1. Open \`index.html\` in a browser
2. Scroll up/down to control the background animation
3. The WebP frame sequence in \`frames-webp/\` powers the scroll animation
4. Copy \`.env.example\` → \`.env.local\` if you enabled any integrations

## Structure
\`\`\`
${projectName}/
├── index.html          # Main website file
├── frames-webp/        # WebP frame sequence (scroll-driven background)
│   ├── frame_000001.webp
│   ├── frame_000002.webp
│   └── ... 
├── .env.example        # Integration placeholders (optional)
├── INTEGRATIONS.md     # Integration notes (optional)
└── README.md
\`\`\`

## Built with
- [Draftly](https://draftly.app) — Visual AI Studio
- Nano Banana Pro — AI Image Generation
- Veo 3 — AI Video Generation
- Gemini — AI Code Generation
`);

        // Generate ZIP
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }, // Balance speed vs size for large frame sets
        });

        console.log(`✅ ZIP bundled: ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB`);

        const uint8Array = new Uint8Array(zipBuffer);
        const arrayBuffer = uint8Array.buffer.slice(
            uint8Array.byteOffset,
            uint8Array.byteOffset + uint8Array.byteLength
        );

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${projectName}.zip"`,
                'Content-Length': zipBuffer.length.toString(),
            },
        });
    } catch (error: any) {
        console.error('3D Builder ZIP bundle error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to bundle ZIP' },
            { status: 500 }
        );
    }
}
