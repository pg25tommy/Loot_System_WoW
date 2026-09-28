// Officer-side Master List — same MasterListView as the public /master-list
// page, just behind requireOfficer() and with the sidebar chrome.
import { requireOfficer } from "@/lib/auth/session";
import { MasterListView } from "@/components/MasterListView";

export default async function OfficerMasterListPage() {
  await requireOfficer();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Master List</h1>
        <p className="mt-1 text-sm text-muted">
          Every active raider&apos;s full bid sheet in one view. Scroll to see every bracket slot; the
          raider column stays pinned.
        </p>
      </div>
      <MasterListView />
    </div>
  );
}
