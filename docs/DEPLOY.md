# Deploy

A aplicação é um monolito **Next.js (front + back)** que depende de **PostgreSQL**
e **MinIO** (storage S3 das imagens). As migrations do Prisma rodam sozinhas no
start do container (ver `docker-entrypoint.sh`).

Dois caminhos abaixo:
- **A) Easypanel (Hostinger)** — recomendado, o painel cuida de proxy + HTTPS.
- **B) Docker Compose na unha** — VPS crua, com Caddy pro TLS.

---

## A) Easypanel (Hostinger)

O Easypanel roda **este `docker-compose.yml`** direto (App do tipo **Compose**),
já buildando a imagem do `app`. O **proxy + TLS (Let's Encrypt) é do Traefik do
painel** — por isso o compose base **não tem Caddy** (ele brigaria pelas portas
80/443). O compose sobe 4 serviços: `postgres`, `minio`, `minio-init` e `app`.

### 1. Criar o serviço Compose
- App do tipo **Compose**, apontando pro repositório Git (usa o `docker-compose.yml`).

### 2. Environment (o painel materializa o `.env`)
Na aba **Environment** cole as variáveis abaixo — o Easypanel grava um `.env`
que o compose lê via `env_file`. Hosts de banco/MinIO usam o **nome do serviço**
do compose (`postgres`, `minio`). Gere o segredo com `openssl rand -base64 33`.

```
POSTGRES_PASSWORD=uma-senha-forte
MINIO_ROOT_USER=um-usuario
MINIO_ROOT_PASSWORD=uma-senha-forte
DATABASE_URL=postgresql://vitriny:uma-senha-forte@postgres:5432/vitriny
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
ADMIN_EMAIL=seu-email@exemplo.com
VITRINY_PIX_KEY=chave-pix-da-vitriny
VITRINY_PIX_HOLDER_NAME=Nome do titular
VITRINY_PIX_CITY=Sua cidade
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO
TZ=America/Sao_Paulo
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<= MINIO_ROOT_USER>
S3_SECRET_ACCESS_KEY=<= MINIO_ROOT_PASSWORD>
S3_BUCKET_NAME=vitriny
S3_PUBLIC_BASE_URL=https://SEU-DOMINIO-DO-MINIO/vitriny
S3_FORCE_PATH_STYLE=true
```

> `POSTGRES_PASSWORD` tem que bater com a senha dentro da `DATABASE_URL`, e
> `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` com `MINIO_ROOT_USER`/`_PASSWORD`.

### 3. Domínios (aba Domains do painel)
Aponte os domínios pros serviços do compose, **na porta interna certa**:
- **app** → porta **3000** (a interface / API).
- **minio** → porta **9000** (URL pública das imagens; casa com `S3_PUBLIC_BASE_URL`).

**Sem domínio próprio ainda?** Use os subdomínios temporários que o Easypanel
gera (baseados no IP, já com HTTPS) — um pro `app`, outro pro `minio` — e coloque
essas URLs em `AUTH_URL`/`NEXT_PUBLIC_APP_URL` e `S3_PUBLIC_BASE_URL`.

### 4. Deploy
Clique em **Deploy**. No start, o `app` aplica as migrations e sobe. Confira o
log do serviço `app`: deve aparecer `[entrypoint] Aplicando migrations do
Prisma...` → `All migrations have been successfully applied.` → `✓ Ready`.

### 5. Serviços externos
- **Google OAuth**: redirect `https://SEU-DOMINIO/api/auth/callback/google`.
- **Stripe webhook**: endpoint `https://SEU-DOMINIO/api/stripe/webhook`, copie o
  `whsec_...` pro `STRIPE_WEBHOOK_SECRET` e redeploy.
- **Resend**: verifique o domínio de envio do `EMAIL_FROM`.
- **Pix da assinatura PRO**: sem Stripe (Pix no Stripe é mediante convite pra
  contas BR — ver `docs/superpowers/specs/2026-08-01-pix-assinatura-pro-design.md`).
  `VITRINY_PIX_KEY`/`_HOLDER_NAME`/`_CITY` são a chave Pix da própria Vitriny, não
  a do provedor. Pagamentos informados aparecem em `/admin/pix-payments` — só o
  e-mail em `ADMIN_EMAIL` acessa essa página.

### Aplicar o domínio próprio depois
1. Comprar o domínio → registro **A** apontando pro IP da VPS.
2. Aba **Domains** → adicionar o domínio no serviço `app` (TLS automático).
3. Trocar `AUTH_URL`, `NEXT_PUBLIC_APP_URL` (e `S3_PUBLIC_BASE_URL` se mudar o
   domínio do MinIO) no Environment → **Deploy**.
4. Atualizar redirect do Google e URL do webhook do Stripe.

> ⚠️ `NEXT_PUBLIC_*` são embutidas **no build**. Trocar de domínio exige um
> **novo Deploy** (rebuild) — não basta editar a env em runtime. No Easypanel
> todo Deploy rebuilda, então é só editar e clicar em Deploy.
>
> O `.env` com os segredos fica de fora do contexto de build (`.dockerignore`),
> então `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_APP_URL` chegam ao
> `next build` via `build.args` no `docker-compose.yml` (que o Compose resolve
> a partir do `.env` que o Easypanel grava do lado da imagem antes do build).
> Sem isso, o Next embute `undefined` no bundle do navegador e a tela de
> assinatura quebra com "Algo deu errado".

---

## B) Docker Compose na unha (VPS crua)

Sobe tudo (app, Postgres, MinIO) e adiciona o **Caddy** via override, pra ter
proxy + TLS. Use só se **não** estiver no Easypanel (lá o Traefik já cuida disso).

1. Instalar Docker: `curl -fsSL https://get.docker.com | sh`
2. Dois registros **A** (`app.` e `cdn.`) → IP da VPS.
3. `cp .env.production.example .env` e preencher (host do banco = `postgres`,
   `S3_ENDPOINT=http://minio:9000`, `AUTH_TRUST_HOST=true`, além de `DOMAIN` e
   `CDN_DOMAIN` usados pelo Caddy).
4. Subir com o override do Caddy:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
   ```

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
