type StatusSectionProps = {
  isPublished: boolean;
  onPublishedChange: (value: boolean) => void;
  slug: string;
};

export function StatusSection({
  isPublished,
  onPublishedChange,
  slug,
}: StatusSectionProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition sm:p-5 ${
        isPublished ? "border-leaf/30 bg-mint/20" : "border-paper-soft bg-paper"
      }`}
    >
      <input
        checked={isPublished}
        className="sr-only"
        name="isPublished"
        onChange={(e) => onPublishedChange(e.target.checked)}
        type="checkbox"
      />

      {/* Pulsing status dot */}
      <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
        {isPublished ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-50" />
            <span className="relative block h-3 w-3 rounded-full bg-leaf" />
          </>
        ) : (
          <span className="block h-3 w-3 rounded-full bg-stone-300" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {isPublished ? "Vitrine ativa" : "Vitrine oculta"}
        </p>
        {isPublished && slug ? (
          <p className="mt-0.5 truncate text-xs font-medium text-leaf">
            /u/{slug}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-ink-muted">
            Ative para receber pedidos pelo link público.
          </p>
        )}
      </div>

      {/* Toggle */}
      <div className="relative h-6 w-11 shrink-0">
        <div
          className={`h-6 w-11 rounded-full transition-colors duration-200 ${
            isPublished ? "bg-leaf" : "bg-stone-300"
          }`}
        />
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isPublished ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </label>
  );
}
