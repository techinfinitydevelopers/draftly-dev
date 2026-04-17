import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3D Website Builder | Draftly',
  description:
    'This path redirects to the Draftly 3D Website Builder — cinematic AI sites from one prompt, about 10× faster than hand-building scroll motion.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050505]">
      {children}
    </div>
  );
}
