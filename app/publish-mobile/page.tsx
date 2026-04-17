'use client';

import Header from '@/components/Header';
import GrungeBackground from '@/components/GrungeBackground';
import Link from 'next/link';

export default function PublishMobilePage() {
  return (
    <div className="min-h-screen bg-obsidian relative">
      <GrungeBackground />
      <div className="relative z-10">
        <Header />
      </div>

      <section className="pt-28 pb-24 px-6 relative z-10">
        <div className="max-w-[800px] mx-auto">
          <h1 className="font-display text-4xl text-white mb-2 flex items-center gap-3">
            <i className="fa-solid fa-mobile-screen text-orange-400"></i>
            Publish to App Store & Play Store
          </h1>
          <p className="text-mist mb-8">
            Turn your Draftly app into real iOS and Android apps using Capacitor. Follow these steps to submit to the Apple App Store and Google Play Store.
          </p>

          <div className="space-y-8">
            <div className="bg-charcoal/80 border border-orange-500/30 rounded-lg p-6">
              <h2 className="text-white font-display text-xl mb-3">What you need</h2>
              <ul className="text-mist text-sm space-y-2">
                <li><strong className="text-white">iOS:</strong> Apple Developer Program ($99/year), Mac with Xcode</li>
                <li><strong className="text-white">Android:</strong> Google Play Console ($25 one-time), Android Studio</li>
              </ul>
            </div>

            <div className="bg-charcoal/80 border border-stone rounded-lg p-6">
              <h2 className="text-white font-display text-xl mb-4">Step-by-step</h2>
              <ol className="space-y-4 text-mist text-sm list-decimal list-inside">
                <li>
                  <span className="text-white font-medium">Download your project</span> — From your project page, use &quot;Download for App Store / Play Store&quot; to get a ZIP with Capacitor config and static export already set up.
                </li>
                <li>
                  <span className="text-white font-medium">Unzip and build</span> — Run <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npm install</code> and <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npm run build</code>.
                </li>
                <li>
                  <span className="text-white font-medium">Add Capacitor</span> — Run <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npm install @capacitor/core @capacitor/cli</code>, then <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npx cap init</code>. When asked for &quot;web asset directory&quot;, use <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">out</code>.
                </li>
                <li>
                  <span className="text-white font-medium">Add platforms</span> — <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npx cap add ios</code> and <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npx cap add android</code>.
                </li>
                <li>
                  <span className="text-white font-medium">Sync and open</span> — <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npx cap sync</code>, then <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npx cap open ios</code> or <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">npx cap open android</code> to build and run in Xcode or Android Studio.
                </li>
                <li>
                  <span className="text-white font-medium">Submit to stores</span> — In Xcode: Product → Archive → Distribute to App Store Connect. In Android Studio: Build → Generate Signed Bundle → upload to Play Console.
                </li>
              </ol>
            </div>

            <div className="bg-charcoal/80 border border-stone rounded-lg p-6">
              <h2 className="text-white font-display text-xl mb-2">Full guide</h2>
              <p className="text-mist text-sm mb-3">
                The project ZIP includes a <code className="bg-obsidian px-1.5 py-0.5 rounded text-orange-400">MOBILE-PUBLISHING.md</code> file with the same steps. For detailed signing, store listing, and troubleshooting, see Capacitor docs.
              </p>
              <a
                href="https://capacitorjs.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 font-mono text-sm"
              >
                Capacitor documentation →
              </a>
            </div>

            <div className="flex gap-4">
              <Link
                href="/projects-dashboard"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-mono font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 transition"
              >
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
