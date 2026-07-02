-- Separa "data e horário" de "local" no formulário público: um item pode
-- exigir só o endereço (ex.: entrega de produto) sem pedir data/horário.
ALTER TABLE "Service" ADD COLUMN "requiresLocation" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: itens que já exigiam agendamento pediam os três campos;
-- preservam o comportamento atual exigindo também o local.
UPDATE "Service" SET "requiresLocation" = true WHERE "requiresSchedulingDetails" = true;
