import { dropResolutionBadgeQuality, dropResolutionLabel } from "@/lib/dropResolutionLabels";

export function ResolutionMethodBadge({ method }: { method: string }) {
  return <span className={`badge ${dropResolutionBadgeQuality(method)}`}>{dropResolutionLabel(method)}</span>;
}
