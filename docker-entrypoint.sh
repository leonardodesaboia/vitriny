#!/bin/sh
set -e

# Aplica migrations pendentes antes de subir o app. `migrate deploy` é
# idempotente (pula o que já foi aplicado) e seguro pra produção — nunca gera
# migration nova nem apaga dados.
run_migrate() {
  node ./prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma
}

# Retry com backoff fixo: em Swarm multi-rede (Easypanel), o DNS interno pode
# oscilar logo no start do task e a conexão ao Postgres falha por instantes
# (P1001). Sem retry, o set -e derruba o container no primeiro blip e vira
# crash-loop. Damos até ~50s de tolerância antes de desistir de verdade.
echo "[entrypoint] Aplicando migrations do Prisma..."
attempt=1
max=10
until run_migrate; do
  if [ "$attempt" -ge "$max" ]; then
    echo "[entrypoint] Migrations falharam após $max tentativas. Abortando."
    exit 1
  fi
  echo "[entrypoint] Banco indisponível (tentativa $attempt/$max). Aguardando 5s..."
  attempt=$((attempt + 1))
  sleep 5
done

echo "[entrypoint] Iniciando o servidor Next.js..."
exec node server.js
