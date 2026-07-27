# Design — Estatísticas de visitas da vitrine (MVP)

Data: 2026-07-22

## Objetivo

Mostrar ao dono do negócio quantas vezes a vitrine pública foi vista, para
provar valor mesmo em semanas sem pedido. Ataca o risco de churn documentado
("o dono conclui que o Vitriny não funciona" — `docs/BACKLOG_TECNICO.md` 283).
É o companheiro de topo de funil do card financeiro "Movimentado no mês" (1.4):
topo = visitas, fundo = R$ movimentado.

**Escopo (MVP, fatiado):** contagem de **views da vitrine inteira**, exibida na
dashboard, **FREE**. Fora do MVP (fase 2, camada PRO): views por item, origem
do tráfego, métricas de conversão. Construir só depois que a base provar valor.

## Decisões-chave

- **Beacon client, não incremento server-side.** Um componente client no
  `/u/[slug]` dispara `POST /api/storefront-view` no mount. Motivos:
  1. **Cache do Next não subconta** — o beacon roda no browser, independe de o
     render server-side ser fresh (a página pode ser cacheada/ISR).
  2. **Número confiável** — a maioria dos bots e os fetchers de preview de link
     (WhatsApp, `facebookexternalhit`, Instagram) **não executam JS**, então o
     beacon já não dispara para eles.
  - Trade-off aceito: visitante sem JS não conta. Subcontagem conservadora é
    melhor que supercontagem inflada por bot.
- **Sem PII, sem cookie, sem cross-site.** Guardamos só contagem agregada por
  dia. Dedupe por sessão usa `sessionStorage` (fica no browser, não vira cookie
  nem vai ao servidor) → LGPD-safe, sem banner de consentimento.

## Modelo de dados

```prisma
model StorefrontView {
  providerId String
  date       DateTime @db.Date
  count      Int      @default(0)

  provider ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@id([providerId, date])
}
```

E a relação inversa em `ProviderProfile`:

```prisma
  storefrontViews StorefrontView[]
```

- Chave composta `(providerId, date)` permite `upsert` com
  `count: { increment: 1 }` — agregado por dia, sem linha-por-hit.
- `date` é `@db.Date` (só data, bucket diário). Buckets em UTC (ver Riscos).
- Views por item (fase 2) virão numa tabela separada (`ItemView` com
  `@@id([serviceId, date])`), evitando o problema de unique com coluna nula.

## Helper `lib/storefront-views.ts` (puro, testável)

```ts
// Deve esta visita ser contada? Exclui o dono logado e User-Agents de bot.
export function isCountableView(input: {
  userAgent: string | null;
  isOwner: boolean;
}): boolean;

// Regex de bot/crawler/preview (backstop; a maioria já não roda o beacon).
export const BOT_UA_PATTERN: RegExp;

// Bucket de dia (UTC, meia-noite) para uma data.
export function toDayBucket(now: Date): Date;
```

Regras de `isCountableView`:
1. `isOwner === true` → `false` (dono não infla a própria métrica).
2. `userAgent` casa `BOT_UA_PATTERN` (bot, crawl, spider, slurp,
   `facebookexternalhit`, whatsapp, telegrambot, headless, preview, etc.) →
   `false`.
3. Caso contrário → `true`.

## Endpoint `POST /api/storefront-view`

Route handler (`app/api/storefront-view/route.ts`), `export const dynamic = "force-dynamic"`.

Fluxo:
1. Lê `{ slug }` do corpo JSON. Slug ausente/ inválido → `400`.
2. Resolve o perfil por `slug` (`select: { id, userId, isPublished }`).
   Não encontrado ou não publicado → `204` (silencioso, não conta).
3. `session = await auth()`; `isOwner = session?.user?.id === profile.userId`.
4. `isCountableView({ userAgent: req.headers.get("user-agent"), isOwner })`.
   Se `false` → `204` (silencioso).
5. `upsert` incrementando o bucket de hoje:
   ```ts
   await prisma.storefrontView.upsert({
     where: { providerId_date: { providerId: profile.id, date: toDayBucket(new Date()) } },
     create: { providerId: profile.id, date: toDayBucket(new Date()), count: 1 },
     update: { count: { increment: 1 } },
   });
   ```
6. Responde `204`. Nunca vaza dado; nunca lança para o cliente (erros são
   logados e viram `204` para não poluir a vitrine).

## Beacon client (`components/public/StorefrontViewBeacon.tsx`)

- `"use client"`, recebe `slug: string`, renderiza `null`.
- `useEffect` no mount: se `sessionStorage["sv-<slug>"]` já existe, não faz nada
  (dedupe: 1 contagem por sessão de browser por vitrine). Senão, marca a flag e
  dispara `fetch("/api/storefront-view", { method: "POST", body: JSON.stringify({ slug }), keepalive: true })`.
- Erros são engolidos (a vitrine não pode quebrar por causa da métrica).
- Renderizado uma vez em `app/u/[slug]/page.tsx`.

## Dashboard

Agregação (server, na `dashboard/page.tsx`): soma de `count` para o perfil nos
últimos 7 e 30 dias:

```ts
const since7 = /* hoje - 6 dias, bucket */;
const [views7, views30] = ... // dois aggregates (_sum.count) com date >= corte
```

Novo componente `components/dashboard/DashboardViewsCard.tsx` (modelado no
`DashboardRevenueCard` existente), exibido no topo do bloco de métricas:

- **Número principal:** views dos últimos **7 dias** ("esta semana").
- **Subtexto:** total dos últimos 30 dias.
- **Framing anti-desânimo:**
  - Com views: "Sua vitrine foi vista N vezes esta semana." + 30 dias no
    subtexto.
  - Views > 0 e **zero pedidos** no período: subtexto vira dica — "Muita gente
    viu — que tal revisar preço, foto ou o texto dos itens?".
  - Zero views: estado de incentivo — "Comece a divulgar o link da sua vitrine."
- FREE vê o card. (Detalhe por item/origem = fase 2 PRO.)

## Testes

- **Unit `lib/storefront-views.ts`:** `isCountableView` (dono → false; UAs de
  bot/preview → false; navegador normal → true); `toDayBucket` (zera hora,
  mesmo dia → mesmo bucket).
- **Integração do endpoint:** dois POSTs no mesmo dia incrementam a mesma linha
  (count 2, não duas linhas); POST como dono não conta; POST com UA de bot não
  conta; slug inexistente/não publicado responde 204 sem criar linha.
- **Dashboard:** a agregação 7/30 dias soma os buckets corretos (janela
  rolante).

## Documentação a atualizar na implementação

- `docs/PROJECT_OVERVIEW.md`: entidade `StorefrontView`; decisão de produto
  (visitas FREE, sem PII/cookie).
- `docs/DATABASE.md`: model `StorefrontView`.
- `docs/ROADMAP.md`: item em "Concluído".
- `docs/BACKLOG_TECNICO.md`: marcar o gancho de retenção e apontar a fase 2
  (per-item/origem/PRO) como próximo passo.

## Riscos e decisões registradas

- **Fuso horário:** buckets em UTC; para um negócio no Brasil (UTC-3), views
  perto da meia-noite caem no "dia" UTC. A janela de 7/30 dias é rolante
  (`date >= corte`), então o efeito no total é desprezível. Se virar problema,
  bucketizar em America/Sao_Paulo depois.
- **Subcontagem por falta de JS:** aceita (conservador). O objetivo é retenção
  por tendência/ordem de grandeza, não precisão contábil.
- **Contenção de escrita:** `upsert increment` numa linha por dia por vitrine
  é suficiente no MVP. Se uma vitrine viralizar, migrar para contagem
  bufferizada/particionada — fora do escopo agora.
- **Framing:** o card nunca mostra "views sem pedido" de forma acusatória;
  vira dica acionável (ponto de churn é psicológico tanto quanto funcional).
- **Fase 2 explicitamente adiada:** views por item, origem do tráfego e
  gating PRO do detalhe. Não iniciar sem nova decisão de produto.
