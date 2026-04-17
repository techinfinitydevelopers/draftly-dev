/** @type {import('next').NextConfig} */
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ? `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
  : null;

const nextConfig = {
  reactStrictMode: true,

  // Legacy Studio product removed — send users and crawlers to the 3D Website Builder.
  async redirects() {
    return [
      { source: '/studio', destination: '/3d-builder', permanent: true },
      { source: '/studio/:path*', destination: '/3d-builder', permanent: true },
      { source: '/docs/studio-workflows', destination: '/docs/3d-builder', permanent: true },
      { source: '/docs/studio-nodes', destination: '/docs/3d-builder', permanent: true },
      { source: '/docs/studio-models', destination: '/docs/3d-builder-models', permanent: true },
    ];
  },

  // ── Firebase Auth: proxy /__/auth to fix signInWithRedirect on mobile (Safari, etc.)
  // Safari 16.1+ blocks third-party cookies; proxying keeps auth on same domain
  ...(firebaseAuthDomain && {
    async rewrites() {
      return {
        beforeFiles: [
          {
            source: '/__/auth/:path*',
            destination: `${firebaseAuthDomain}/__/auth/:path*`,
          },
        ],
      };
    },
  }),

  // ── Security: disable source maps in production ──
  // This prevents users from reading original source code in DevTools → Sources tab
  productionBrowserSourceMaps: false,

  // ── Allow large request bodies for multi-image API calls ──
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@xyflow/react',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/analytics',
    ],
  },

  // ── Security: add security headers ──
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.googletagmanager.com https://www.gstatic.com https://cdn.jsdelivr.net https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://accounts.google.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://*.firebaseapp.com https://accounts.google.com wss://*.firebaseio.com https://api.apiyi.com https://identitytoolkit.googleapis.com https://*.fal.ai https://replicate.delivery https://api.dodopayments.com https://www.google-analytics.com https://www.facebook.com https://*.facebook.com https://*.facebook.net",
              "media-src 'self' blob: data: https:",
              "frame-src 'self' blob: data: https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // Block all API routes from being cached by browsers/CDNs
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
