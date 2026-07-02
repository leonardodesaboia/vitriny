-- Soft delete de conta: a conta é anonimizada (dados pessoais removidos),
-- mas o histórico de pedidos e propostas permanece para fins administrativos.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletedEmailHash" TEXT;

-- CreateIndex
CREATE INDEX "User_deletedEmailHash_idx" ON "User"("deletedEmailHash");
