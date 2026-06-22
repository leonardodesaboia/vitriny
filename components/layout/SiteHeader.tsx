import Link from "next/link";

import { AuthButton } from "@/components/auth/AuthButton";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link className="text-lg font-bold text-ink" href="/">
          OrçaFácil
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-5 text-sm">
          <a className="font-medium text-stone-700 hover:text-leaf" href="#como-funciona">
            Como funciona
          </a>
          <a className="font-medium text-stone-700 hover:text-leaf" href="#proximos-passos">
            Próximos passos
          </a>
        </nav>
        <AuthButton />
      </div>
    </header>
  );
}
