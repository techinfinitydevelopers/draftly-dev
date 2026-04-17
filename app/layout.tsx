import type { Metadata, Viewport } from 'next'
import dynamic from 'next/dynamic'
import './fonts'
import './globals.css'

const GuideChatWidgetHost = dynamic(
  () => import('@/components/guide-chat/GuideChatWidgetHost').then((m) => m.GuideChatWidgetHost),
  { ssr: false },
)
import OnboardingCheck from '@/components/OnboardingCheck'
import FontAwesomeLoader from '@/components/FontAwesomeLoader'

const AnalyticsTracker = dynamic(() => import('@/components/AnalyticsTracker'), { ssr: false })
const UserActivityPing = dynamic(() => import('@/components/UserActivityPing'), { ssr: false })
const CookieConsent = dynamic(() => import('@/components/CookieConsent'), { ssr: false })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://draftly.space';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Draftly — 3D Website Builder',
    template: '%s | Draftly',
  },
  description:
    'Draftly is a 3D website builder: turn one prompt into a cinematic scroll-driven site with AI-generated motion, extracted frames, and deploy-ready HTML — build 3D websites about 10× faster than traditional workflows.',
  keywords: [
    '3D website builder',
    'AI website builder',
    'cinematic website',
    'scroll website',
    'Draftly',
    'motion website',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Draftly',
    title: 'Draftly — 3D Website Builder',
    description:
      'Build cinematic 3D websites from a single prompt — about 10× faster. AI motion, frame extraction, and production HTML in minutes.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Draftly — 3D Website Builder',
    description:
      'AI 3D website builder: cinematic scroll sites from one prompt. Motion, frames, and deploy-ready code — fast.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link
          rel="preconnect"
          href="https://cdnjs.cloudflare.com"
          crossOrigin="anonymous"
        />
        <noscript>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        </noscript>
      </head>
      <body className="bg-black font-sans">
        <div className="bg-grid-global" />
        <div className="bg-lines" />
        <div className="bg-dots" />
        <div className="bg-vignette" />
        <div className="bg-noise" />
        <div className="relative z-10">
          <AnalyticsTracker />
          <UserActivityPing />
          <FontAwesomeLoader />
          <OnboardingCheck>
            {children}
          </OnboardingCheck>
          <CookieConsent />
          <GuideChatWidgetHost />
        </div>
      </body>
    </html>
  )
}
