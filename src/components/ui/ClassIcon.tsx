import { classIconUrl, getClass } from "@/lib/wowClasses";

const SIZES = { sm: 20, md: 28, lg: 40 };

// NOTE: `className` here is the WoW class name (e.g. "Warlock"), not a CSS
// class list — named to match the Character.class field it's always fed.
export function ClassIcon({
  className,
  size = "md",
}: {
  className: string | null | undefined;
  size?: keyof typeof SIZES;
}) {
  const px = SIZES[size];
  const cls = getClass(className);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={classIconUrl(className)}
      alt={cls?.name ?? className ?? "Unknown class"}
      width={px}
      height={px}
      className="rounded border shrink-0"
      style={{ borderColor: "var(--border)" }}
    />
  );
}
