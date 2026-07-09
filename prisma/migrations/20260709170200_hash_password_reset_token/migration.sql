-- Tokens de reset passam a ser armazenados como hash SHA-256.
-- Pendentes são apagados na virada (TTL de 1h): quem pediu reset pede de novo.
DELETE FROM "PasswordResetToken";

ALTER TABLE "PasswordResetToken" RENAME COLUMN "token" TO "tokenHash";

ALTER INDEX "PasswordResetToken_token_key" RENAME TO "PasswordResetToken_tokenHash_key";
