import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-paper-soft bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          className="font-fraunces text-xl font-semibold tracking-tight text-ink transition-colors hover:text-leaf"
          href="/"
        >
          OrçaFácil
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm md:flex">
          <a
            className="font-medium text-ink-muted transition-colors hover:text-leaf"
            href="#como-funciona"
          >
            Como funciona
          </a>
          <a
            className="font-medium text-ink-muted transition-colors hover:text-leaf"
            href="#funcionalidades"
          >
            Funcionalidades
          </a>
        </nav>
        <AuthButton />
      </div>
    </header>
  );
}
