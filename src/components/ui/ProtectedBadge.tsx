import { Lock } from "lucide-react";

export function ProtectedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 border border-protected text-protected px-2 py-0.5 rounded-badge text-xs font-medium">
      <Lock className="w-3 h-3" />
      Protected Stream
    </span>
  );
}
