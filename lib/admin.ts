// Admin único via env var: não existe (ainda) sistema de roles na
// aplicação. Se um dia houver mais de um admin, evolui pra lista/tabela.
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email === process.env.ADMIN_EMAIL;
}
