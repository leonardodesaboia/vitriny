import Link from "next/link";

import { auth } from "@/auth";

const buttonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf";

export async function AuthButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link className={buttonClassName} href="/login">
        Entrar
      </Link>
    );
  }

  return (
    <Link className={buttonClassName} href="/dashboard">
      Ir para o painel
    </Link>
  );
}
