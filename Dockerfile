# syntax=docker/dockerfile:1

# Imagem base: Node 22 (bater com .nvmrc). Debian slim evita dores de cabeça
# com binários nativos (sharp, prisma, @react-pdf/renderer) que o Alpine/musl
# às vezes causa.
FROM node:22-bookworm-slim AS base
# openssl é exigido pelo query engine do Prisma em runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- deps: instala TODAS as dependências (inclui dev, pra buildar) ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder: gera o Prisma Client e faz o build standalone do Next ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* são embutidas no bundle pelo `next build`, então precisam
# chegar via --build-arg (o .env com os segredos fica de fora da imagem por
# causa do .dockerignore, e só chega em runtime via env_file no compose).
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# O script "build" já roda `prisma generate && next build --webpack`.
RUN npm run build
# Este projeto não usa a pasta public/ (assets vêm do App Router). Garante que
# ela exista pra o COPY do runner não quebrar, e continua válida se um dia surgir.
RUN mkdir -p public

# ---------- prisma-cli: árvore ISOLADA só com o CLI do Prisma + suas deps ----------
# O CLI tem dependências top-level (effect, @prisma/config...) que não vêm no
# standalone do Next. Instalar isolado dá a árvore completa sem inchar a imagem
# do app com todo o node_modules. Versão fixada = a de @prisma/client.
FROM base AS prisma-cli
WORKDIR /opt/prisma-cli
RUN npm init -y > /dev/null 2>&1 && npm install prisma@6.19.3

# ---------- runner: imagem final, mínima, só com o standalone ----------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bind em todas as interfaces do container e porta padrão.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Usuário sem privilégios.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Assets estáticos e públicos não vão no standalone — copiar manualmente.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Query engine do Prisma pro runtime do APP (o tracing do Next às vezes o perde).
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# CLI isolado do Prisma + schema/migrations, usados só pelo entrypoint no start.
COPY --from=prisma-cli /opt/prisma-cli/node_modules ./prisma-cli/node_modules
COPY --from=builder /app/prisma ./prisma
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
# Aplica migrations e sobe o server (ver docker-entrypoint.sh).
CMD ["./docker-entrypoint.sh"]
