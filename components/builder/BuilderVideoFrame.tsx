'use client';

/** Full-bleed video preview — no extra zoom/crop (avoids soft, “filtered” look). */
export function BuilderVideoFrame({
  src,
  fallbackSrc,
  className = '',
  autoPlay = true,
}: {
  src: string;
  fallbackSrc?: string | null;
  className?: string;
  autoPlay?: boolean;
}) {
  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black aspect-video ${className}`}>
      <video
        controls
        muted
        loop
        autoPlay={autoPlay}
        playsInline
        className="absolute inset-0 h-full w-full object-contain bg-black"
      >
        <source src={src} />
        {fallbackSrc ? <source src={fallbackSrc} /> : null}
      </video>
    </div>
  );
}
