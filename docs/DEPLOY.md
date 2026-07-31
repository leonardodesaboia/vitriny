# Deploy

A aplicação é um monolito **Next.js (front + back)** que depende de **PostgreSQL**
e **MinIO** (storage S3 das imagens). As migrations do Prisma rodam sozinhas no
start do container (ver `docker-entrypoint.sh`).

Dois caminhos abaixo:
- **A) Easypanel (Hostinger)** — recomendado, o painel cuida de proxy + HTTPS.
- **B) Docker Compose na unha** — VPS crua, com Caddy pro TLS.

---

## A) Easypanel (Hostinger)

O Easypanel usa Traefik por baixo: **reverse proxy e TLS (Let's Encrypt) são
automáticos**. Você cria 3 serviços no painel.

### 1. Postgres
Crie um serviço de template **Postgres**. Anote usuário, senha e o **nome do
host interno** (o próprio nome do serviço, ex.: `vitriny_postgres`).

### 2. MinIO
Crie um serviço **MinIO** (template, ou imagem `minio/minio`). Defina
`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`. Exponha um domínio pro MinIO (aba
Domains) — é a URL pública das imagens. Crie o bucket `vitriny` e deixe-o com
leitura pública (`download`) — via console do MinIO ou `mc`.

### 3. App (este repositório)
- **Source**: aponte pro repositório Git.
- **Build**: tipo **Dockerfile** (o Easypanel builda a última stage, `runner`).
- **Domains**: adicione um domínio. **Sem domínio próprio ainda?** Use o
  subdomínio temporário que o Easypanel gera (baseado no IP, já com HTTPS).
- **Environment**: cole as variáveis (ver bloco abaixo).

### Variáveis de ambiente (aba Environment do App)
Use os **nomes internos dos serviços** como host de banco/MinIO e o **domínio
público** nas URLs. Gere o segredo com `openssl rand -base64 33`.

```
DATABASE_URL=postgresql://USER:SENHA@vitriny_postgres:5432/vitriny
AUTH_SECRET=<openssl rand -base64 33>
AUTH_URL=https://SEU-DOMINIO
AUTH_TRUST_HOST=true
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
RESEND_API_KEY=...
EMAIL_FROM=AllSet <contato@allsetservicos.com>
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRO_PRICE_ID=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO
TZ=America/Sao_Paulo
S3_ENDPOINT=http://vitriny_minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<MINIO_ROOT_USER>
S3_SECRET_ACCESS_KEY=<MINIO_ROOT_PASSWORD>
S3_BUCKET_NAME=vitriny
S3_PUBLIC_BASE_URL=https://SEU-DOMINIO-DO-MINIO/vitriny
S3_FORCE_PATH_STYLE=true
```

### 4. Deploy
Clique em **Deploy**. No start, o container aplica as migrations e sobe. Veja o
log — deve aparecer `[entrypoint] Aplicando migrations do Prisma...`.

### 5. Serviços externos
- **Google OAuth**: redirect `https://SEU-DOMINIO/api/auth/callback/google`.
- **Stripe webhook**: endpoint `https://SEU-DOMINIO/...` (confira o caminho em
  `app/`), copie o `whsec_...` pro `STRIPE_WEBHOOK_SECRET` e redeploy.
- **Resend**: verifique o domínio de envio do `EMAIL_FROM`.

### Aplicar o domínio próprio depois
1. Comprar o domínio → registro **A** apontando pro IP da VPS.
2. App → aba **Domains** → adicionar o domínio (TLS sai automático).
3. Trocar `AUTH_URL`, `NEXT_PUBLIC_APP_URL` (e `S3_PUBLIC_BASE_URL` se mudar o
   domínio do MinIO) → **Deploy**.
4. Atualizar redirect do Google e URL do webhook do Stripe.

> ⚠️ `NEXT_PUBLIC_*` são embutidas **no build**. Trocar de domínio exige um
> **novo Deploy** (rebuild) — não basta editar a env em runtime. No Easypanel
> todo Deploy rebuilda, então é só editar e clicar em Deploy.

---

## B) Docker Compose na unha (VPS crua)

Sobe tudo (app, Postgres, MinIO, Caddy) num único compose. Use se **não** estiver
no Easypanel.

1. Instalar Docker: `curl -fsSL https://get.docker.com | sh`
2. Dois registros **A** (`app.` e `cdn.`) → IP da VPS.
3. `cp .env.production.example .env` e preencher (host do banco = `postgres`,
   `S3_ENDPOINT=http://minio:9000`, `AUTH_TRUST_HOST=true`).
4. `docker compose up -d --build`

Ordem garantida: `postgres` (healthy) → `minio-init` (bucket) → `app` (aplica
migrations no start) → `caddy` (emite TLS). Logs: `docker compose logs -f app caddy`.

---

## Operação (ambos)

**Backup do banco:**
```bash
docker compose exec postgres pg_dump -U vitriny vitriny > backup_$(date +%F).sql
```
No Easypanel, use o backup do serviço Postgres pelo painel.

**Backup das imagens:** snapshot do volume de dados do MinIO.

## Notas

- Migrations em produção usam sempre `prisma migrate deploy` (nunca `migrate dev`);
  o `docker-entrypoint.sh` roda isso automaticamente no start.
- HSTS: no Easypanel o Traefik cuida do TLS; no caminho B o Caddy aplica HSTS.
  O CSP segue desligado no `next.config.mjs` até mapear as origens do Stripe.
