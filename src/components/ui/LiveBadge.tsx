export function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 bg-live-red px-2 py-0.5 rounded-badge text-white text-xs font-semibold uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      Live
    </span>
  );
}
