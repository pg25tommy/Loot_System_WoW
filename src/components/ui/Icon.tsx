// Inline-SVG icon set for the sidebar/header nav — avoids pulling in an icon
// library for what's currently a small, fixed set of glyphs.
const PATHS: Record<string, string> = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  characters: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75",
  items: "M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5",
  resolve: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01 9 11.01",
  drops: "M12 8v4l2.5 2.5M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z",
  openRolls: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  worldBoss: "M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7l-9-5Zm0 6v6m-3-3h6",
  gatherables: "M6 3h12l4 6-10 12L2 9l4-6Zm0 0 6 6 6-6M2 9h20",
  recipes: "M8 3h8a1 1 0 0 1 1 1v16l-5-3-5 3V4a1 1 0 0 1 1-1Zm0 6h8",
  attendance: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm4 10 2 2 4-4",
  phases: "M4 3v18l8-5 8 5V3H4Z",
  bracketConfig: "M4 21V10m0-4V3m8 18v-9m0-4V3m8 18v-6m0-4V3M2 10h4m4-4h4m4 8h4",
  rankTiers: "M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Z",
  gatherableValues: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  officers: "M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Zm-3 10 2 2 4-4",
  characterCount: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  itemCount: "M21 8 12 3 3 8l9 5 9-5Zm0 0v8l-9 5-9-5V8",
  chevronRight: "m9 18 6-6-6-6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m6 14 5-5-5-5m5 5H9",
  masterList: "M3 3h18v18H3V3Zm0 6h18M3 15h18M9 3v18M15 3v18",
};

export function Icon({
  name,
  className,
  size = 18,
}: {
  name: keyof typeof PATHS;
  className?: string;
  size?: number;
}) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
