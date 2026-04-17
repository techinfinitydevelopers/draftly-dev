export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
        <span className="text-white/30 text-sm tracking-wide">Loading...</span>
      </div>
    </div>
  );
}
