# Design — Fase 2: Itens mais vistos (PRO)

Data: 2026-07-22

## Objetivo

Estender as estatísticas de visitas (fase 1) com **itens mais vistos**, como
recurso **PRO** — o gancho de upsell natural: FREE vê o total da vitrine, PRO
descobre *qual item gera mais interesse*. Complementa o card de visitas já
entregue.

**Escopo:** ranking de itens por interesse (últimos 30 dias) + gating PRO do
detalhe na dashboard. **Fora do escopo (fase 3):** origem do tráfego — via
`document.referrer` o dado é enganoso (Instagram/WhatsApp abrem em navegador
in-app que remove o referrer); origem confiável exige links marcados
(`?ref=`), que é outra feature.

## O que conta como "view de item"

A vitrine não tem página pública de detalhe por item; os cards levam para
`/u/[slug]/orcamento?serviceId=X` (mesmo destino do "link de venda por item").
Logo, **"view de item" = abrir a página de orçamento com um item selecionado** —
um sinal de **interesse**, mais valioso que impressão. Registrado por beacon,
com dedupe por sessão por item.

## Registro (reaproveita a infra da fase 1)

- **Beacon:** generaliza `components/public/StorefrontViewBeacon.tsx` para
  aceitar `serviceId?: string` opcional. A chave de dedupe passa a ser
  `sv-<slug>` (vitrine) ou `sv-<slug>-item-<serviceId>` (item). Renderizado em
  `app/u/[slug]/orcamento/page.tsx` quando há `selectedService`.
- **Endpoint:** estende `POST /api/storefront-view` para aceitar `serviceId`
  opcional no corpo:
  - Sem `serviceId` → `StorefrontView` (comportamento atual, inalterado).
  - Com `serviceId` → valida que o item existe, está ativo e pertence ao
    **perfil publicado** (`prisma.service.findFirst({ where: { id: serviceId, providerId: profile.id } })`); aplica o mesmo `isCountableView` (dono/bot);
    faz `upsert increment` em `ItemView`.
  - Para evitar dupla contagem, o beacon de item registra **só o item** (o
    total da vitrine continua sendo contado em `/u/[slug]`). Um visitante que
    chega direto por link de item não soma no total — subcontagem de borda
    aceita.

## Modelo de dados

```prisma
model ItemView {
  serviceId String
  date      DateTime @db.Date
  count     Int      @default(0)

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@id([serviceId, date])
}
```
E a relação inversa em `Service`:
```prisma
  views ItemView[]
```
- Mesma estratégia da fase 1: agregado por dia, PK composta, cascade no delete
  do item.

## Gating PRO

Estende `lib/plan-limits.ts`:
- `PLAN_FEATURES` ganha `storefrontAnalytics: boolean` (FREE `false`, PRO `true`).
- Novo helper `canUseStorefrontAnalytics(plan)`.

## Dashboard — card "Itens mais vistos"

Novo componente `components/dashboard/DashboardTopItemsCard.tsx`, abaixo do
card de visitas (fase 1):

- **FREE:** card de **upsell bloqueado** — "Descubra seus itens mais vistos no
  Pro" com link para `/dashboard/billing`. Não roda query de agregação.
- **PRO com dados:** ranking dos **top 5** itens (últimos 30 dias): posição,
  nome do item, contagem de visitas.
- **PRO sem dados:** estado vazio — "Ainda sem visitas em itens. Compartilhe os
  links dos seus itens."

Agregação (só quando PRO), na `dashboard/page.tsx`:
```ts
const groups = await prisma.itemView.groupBy({
  by: ["serviceId"],
  where: { service: { providerId: profile.id }, date: { gte: cutoff30 } },
  _sum: { count: true },
  orderBy: { _sum: { count: "desc" } },
  take: 5,
});
// nomes dos itens do ranking:
const names = await prisma.service.findMany({
  where: { id: { in: groups.map((g) => g.serviceId) } },
  select: { id: true, name: true },
});
const topItems = mergeItemViewRanking(groups, names);
```

Helper puro em `lib/dashboard.ts` (testável):
```ts
export type TopItem = { serviceId: string; name: string; count: number };

// Junta o resultado do groupBy com os nomes, preservando a ordem do ranking e
// descartando itens sem nome (removidos entre a agregação e a leitura).
export function mergeItemViewRanking(
  groups: Array<{ serviceId: string; _sum: { count: number | null } }>,
  names: Array<{ id: string; name: string }>
): TopItem[];
```

## Testes

- **Integração do endpoint:** `serviceId` válido → linha em `ItemView` com
  `count` incrementado; `serviceId` de outro perfil → não conta; dono/bot não
  contam; sem `serviceId` → continua contando `StorefrontView` (não regride).
- **Unit `mergeItemViewRanking`:** preserva ordem do ranking; junta nomes;
  descarta `serviceId` sem nome correspondente; trata `_sum.count` nulo como 0.
- **Unit `canUseStorefrontAnalytics`:** FREE `false`, PRO `true`.

## Documentação a atualizar

- `docs/PROJECT_OVERVIEW.md`: entidade `ItemView`; decisão (itens mais vistos =
  PRO; origem adiada para fase 3 por confiabilidade do referrer).
- `docs/DATABASE.md`: model `ItemView`.
- `docs/ROADMAP.md`: item em "Concluído".
- `docs/BACKLOG_TECNICO.md`: marcar fase 2 (per-item + PRO) entregue; apontar
  fase 3 = origem do tráfego via links marcados.

## Riscos e decisões registradas

- **Referrer não confiável → origem adiada:** decisão explícita de não medir
  origem por referrer; fase 3 fará via links marcados (`?ref=`).
- **Beacon de item não soma no total da vitrine:** evita dupla contagem;
  subcontagem de borda (link direto de item) aceita.
- **Fuso/UTC e subcontagem sem-JS:** herdados da fase 1 (mesmos trade-offs).
- **groupBy com filtro por relação:** `where: { service: { providerId } }` é
  suportado pelo Prisma; o `take: 5` roda no banco.
- **Top 5 fixo:** número escolhido para caber no card sem paginação; ajustável
  depois sem mudança de modelo.
