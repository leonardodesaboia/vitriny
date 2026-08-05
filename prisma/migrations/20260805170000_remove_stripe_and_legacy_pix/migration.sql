-- Remove Stripe billing fields and legacy manual-Pix field.
-- Pagamento do plano PRO passa a ser exclusivamente via Mercado Pago.
-- Índices únicos associados às colunas são removidos junto pelo Postgres.
ALTER TABLE "ProviderProfile" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "ProviderProfile" DROP COLUMN IF EXISTS "stripeSubscriptionId";
ALTER TABLE "ProviderProfile" DROP COLUMN IF EXISTS "stripePriceId";

ALTER TABLE "ProPixPayment" DROP COLUMN IF EXISTS "clientPaidAt";
