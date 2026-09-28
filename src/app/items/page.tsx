// Public searchable item catalog.
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const items = await prisma.item.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Items</h1>
        <p className="mt-1 text-sm text-muted">Browse the item catalog and see who's bidding.</p>
      </div>

      <form className="max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name..."
          className="w-full input"
        />
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No items found.</p>
      ) : (
        <ul className="divide-y divide-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/items/${item.id}`}
                className="flex items-center justify-between py-3 hover-row"
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted">{item.slot ?? "—"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
