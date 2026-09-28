// Public "All Bids" page — no login required. Mirrors the officer version
// at /officer/master-list exactly (same MasterListView component).
import { MasterListView } from "@/components/MasterListView";

export default function PublicMasterListPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">All Bids</h1>
        <p className="mt-1 text-sm text-muted">
          Every active raider&apos;s full bid sheet in one view. Scroll to see every bracket slot; the
          raider column stays pinned.
        </p>
      </div>
      <MasterListView />
    </div>
  );
}
