-- Snapshot do nome do item no pedido: preserva o histórico mesmo se o item
-- for renomeado ou excluído.
ALTER TABLE "QuoteRequest" ADD COLUMN "serviceNameSnapshot" TEXT;

-- Backfill: pedidos existentes que ainda têm o item vinculado herdam o nome
-- atual (melhor aproximação disponível do nome na época do pedido).
UPDATE "QuoteRequest" q
SET "serviceNameSnapshot" = s."name"
FROM "Service" s
WHERE q."serviceId" = s."id" AND q."serviceNameSnapshot" IS NULL;
