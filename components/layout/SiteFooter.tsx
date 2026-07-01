import Link from "next/link";

const nav = [
  {
    heading: "Produto",
    links: [
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Funcionalidades", href: "#funcionalidades" },
      { label: "Preços", href: "#precos" },
    ],
  },
  {
    heading: "Conta",
    links: [
      { label: "Criar conta", href: "/cadastro" },
      { label: "Entrar", href: "/login" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Termos de uso", href: "#" },
      { label: "Privacidade", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-paper-soft bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Top row */}
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="font-fraunces text-xl font-semibold text-ink transition-colors hover:text-leaf"
            >
              Vitriny
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-ink-muted">
              Uma vitrine online para produtos, serviços, pedidos e propostas.
            </p>
            <div className="mt-5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
              <span className="text-xs text-ink-muted">Produto brasileiro</span>
            </div>
          </div>

          {/* Nav columns */}
          {nav.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink">
                {col.heading}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-ink-muted transition-colors hover:text-leaf"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-paper-soft pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} Vitriny. Todos os direitos reservados.
          </p>
          <p className="text-xs text-ink-muted/60">
            Pagamentos processados por{" "}
            <span className="font-semibold text-ink-muted">Stripe</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
