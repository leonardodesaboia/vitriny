import Link from "next/link";

export function PoweredByVitriny() {
  return (
    <p className="mt-14 border-t border-paper-soft pt-6 text-center text-xs text-ink-muted/70">
      Powered by{" "}
      <Link
        className="rounded-sm font-semibold text-ink-muted transition hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        href="/"
      >
        Vitriny
      </Link>
    </p>
  );
}
