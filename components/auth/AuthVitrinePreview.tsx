// Mini vitrine ilustrativa para o painel de autenticação: mostra o produto que
// o visitante vai criar. O viewport carrega seu próprio data-brand-color/font,
// então os tokens (--color-leaf, etc.) resolvem para o tema desta vitrine de
// exemplo (OCEAN) — azul, contrastando com o painel verde e sugerindo que a cor
// é personalizável. Conteúdo é ilustrativo.
const SAMPLE_ITEMS = [
  { title: "Arranjo de flores", price: "R$ 120" },
  { title: "Buquê do dia", price: "Sob consulta" },
] as const;

export function AuthVitrinePreview() {
  return (
    <figure className="m-0 w-full overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_24px_60px_-15px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-2 border-b border-paper-soft bg-paper px-3 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-paper-soft" />
          <span className="h-2.5 w-2.5 rounded-full bg-paper-soft" />
          <span className="h-2.5 w-2.5 rounded-full bg-paper-soft" />
        </span>
        <span className="flex-1 truncate rounded-md border border-paper-soft bg-white px-2.5 py-1 text-center text-[11px] font-medium text-ink-muted">
          vitriny.com/u/atelie-aurora
        </span>
      </div>

      <div className="bg-paper" data-brand-color="OCEAN" data-brand-font="CLASSIC">
        <div className="grain relative overflow-hidden bg-leaf px-4 pb-5 pt-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/70">
            Catálogo
          </p>
          <p className="mt-1.5 break-words font-fraunces text-2xl font-bold leading-[1.05] text-white">
            Ateliê Aurora
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Aberto agora
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-leaf">
              Ver contato
            </span>
          </div>
        </div>

        <div className="px-4 pb-5 pt-4">
          <p className="font-fraunces text-sm font-bold text-ink">O que ofereço</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {SAMPLE_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-paper-soft bg-white p-2"
              >
                <div className="mb-2 h-12 rounded-lg bg-mint" />
                <p className="truncate text-[11px] font-semibold text-ink">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-leaf">
                  {item.price}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
