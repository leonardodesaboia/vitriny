import crypto from "node:crypto";

// SHA-256 dos tokens de uso único (verificação de e-mail, reset de senha):
// vazamento do banco não permite usar os links.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
