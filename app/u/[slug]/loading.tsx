// Skeleton da vitrine pública durante o carregamento (clique frio do WhatsApp
// é o momento mais frágil). Ver docs/UX_UI_AUDIT.md CJ-H.
export default function PublicProfileLoading() {
  return (
    <main className="min-h-screen bg-paper font-jakarta" aria-busy="true">
      <div className="bg-leaf px-4 pb-12 pt-10 sm:px-6 sm:pb-14 sm:pt-12">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-3 w-40 rounded bg-white/25" />
          <div className="h-12 w-3/4 rounded bg-white/25" />
          <div className="h-5 w-24 rounded-full bg-white/25" />
          <div className="h-4 w-2/3 rounded bg-white/20" />
        </div>
      </div>
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-4xl pt-10">
          <div className="grid animate-pulse gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-paper-soft bg-white"
              />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Carregando vitrine…</span>
    </main>
  );
}
