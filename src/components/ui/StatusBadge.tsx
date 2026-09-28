// Generic status pill for raw enum values (BidStatus, DropStatus) that are
// already human-readable as-is — unlike DropResolutionMethod, which needs
// ResolutionMethodBadge's label mapping instead.
const QUALITY: Record<string, string> = {
  EMPTY: "badge-poor",
  ACTIVE: "badge-uncommon",
  PENDING: "badge-legendary",
  BLOCKED: "badge-epic",
  RESOLVED: "badge-uncommon",
  VOID: "badge-poor",
};

export function StatusBadge({ status }: { status: string }) {
  const quality = QUALITY[status] ?? "badge-rare";
  return <span className={`badge ${quality}`}>{status}</span>;
}
