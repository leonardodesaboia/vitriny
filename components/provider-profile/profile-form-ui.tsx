import { labelClass } from "@/components/ui/Field";

export { labelClass };

export const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

export function SectionHeader({
  label,
  description,
  divider = true,
}: {
  label: string;
  description?: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? "border-t border-paper-soft pt-6" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        {label}
      </p>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}
