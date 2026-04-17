export default function StudioLoading() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500/70 rounded-full animate-spin" />
        <span className="text-white/30 text-sm tracking-wide">Loading Studio...</span>
      </div>
    </div>
  );
}
