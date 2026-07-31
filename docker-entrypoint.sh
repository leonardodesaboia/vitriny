#!/bin/sh
set -e

# Aplica migrations pendentes antes de subir o app. `migrate deploy` é
# idempotente (pula o que já foi aplicado) e seguro pra produção — nunca gera
# migration nova nem apaga dados. Se falhar, o container sai e o app não sobe
# quebrado (o Easypanel mostra o erro no log do deploy).
echo "[entrypoint] Aplicando migrations do Prisma..."
node ./prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Iniciando o servidor Next.js..."
exec node server.js
