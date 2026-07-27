# Design — Seção 1 restante do backlog (1.2, 1.3, 1.4)

Data: 2026-07-09
Origem: `docs/BACKLOG_TECNICO.md` seções 1.2, 1.3 e 1.4 (a 1.1 tem spec própria:
`2026-07-09-pix-ja-paguei-design.md`)
Status: escopo aprovado pelo usuário ("faça a seção 1 completa")

Ordem de implementação (menor risco primeiro): **1.1 → 1.3 → 1.4 → 1.2**.

---

## 1.3 Compartilhar item no WhatsApp

**Problema:** o dono só compartilha a vitrine inteira; falta o link de venda por
item — como esse público realmente vende.

### Mensagem e URL

`lib/whatsapp-messages.ts`:

```ts
export function itemShareMessage(
  name: string,
  price: string | null, // já formatado em BRL, ou null (sob consulta)
  url: string
): string
```

Texto: `Olá! Veja {nome} na minha vitrine{ — R$ X quando houver preço fixo}:\n{url}`.
URL: `${NEXT_PUBLIC_APP_URL}/u/{slug}/orcamento?serviceId={id}` — a página de
orçamento já pré-seleciona o item pelo query param (verificado no código).

### UI

- **Decisão de posicionamento** (diverge do "ao lado do preço" do backlog): o
  header colapsado do `ServiceItem` é um único `<button>` (accordion); botão
  aninhado é HTML inválido e reestruturar o grid do header é risco desnecessário.
  O bloco **"Divulgar"** entra no painel expandido do item, acima do
  `ServiceForm`, com dois controles:
  - "Compartilhar no WhatsApp": `https://wa.me/?text=...` (sem número — o dono
    escolhe o contato no próprio WhatsApp).
  - "Copiar link": reusa o padrão do `CopyButton` existente.
- Exibido apenas para itens **ativos** (item oculto não existe na vitrine).
- O `slug` chega ao `ServiceItem` por props: página `servicos` (adicionar
  `slug` ao `select` do perfil) → `ServiceList` → `ServiceItem`, mesmo caminho
  do `allowItemTypeSelection`. Sem slug (perfil incompleto), o bloco não aparece.

### Testes

Unit de `itemShareMessage` (com e sem preço). Componente é apresentacional;
sem testes de UI novos.

---

## 1.4 Resumo financeiro do mês na dashboard

**Problema:** a dashboard conta pedidos/propostas mas não mostra quanto o
negócio movimentou — o número que retém o usuário.

### Dados

Em `app/(dashboard)/dashboard/page.tsx`, dois `aggregate` a mais na
`$transaction` existente:

- `proposal.aggregate({ _sum: { totalAmount }, where: { providerId, status: "APPROVED", respondedAt: { gte: monthRange.start, lt: monthRange.end } } })`
- `quoteRequest.aggregate({ _sum: { fixedServiceAmount }, where: { providerId, pixReservationPaidAt: { gte: monthRange.start, lt: monthRange.end } } })`

Semântica: "movimentado" = propostas aprovadas no mês (pelo `respondedAt`) +
reservas Pix confirmadas no mês (pelo `pixReservationPaidAt`). Decimal nunca
cruza a fronteira server→client: somar no server e passar **strings já
formatadas** em BRL.

### UI

- **Decisão** (ajuste sobre o backlog): o `DashboardMetricGrid` usa
  `AnimatedCounter` com `value: number` — não serve para dinheiro formatado.
  O resumo vira um **card de destaque próprio** (`DashboardRevenueCard`,
  server component simples em `components/dashboard/`), renderizado acima do
  `DashboardMetricGrid`.
- Conteúdo: rótulo "Movimentado no mês", valor total em destaque (Fraunces,
  como os demais), descrição com o breakdown: "R$ A em propostas aprovadas ·
  R$ B em pedidos Pix confirmados". Sem link nesta fase.
- Zerado (R$ 0,00) renderiza normalmente — o número baixo também informa.

### Testes

Função pura `buildMonthlyRevenueSummary(approvedSum, pixSum)` em
`lib/dashboard.ts` (soma + formatação + breakdown) com testes unitários em
`tests/unit/dashboard.test.ts`.

---

## 1.2 Página de detalhe do pedido

**Problema:** tudo vive em cards expansíveis numa lista única; e-mails apontam
para a lista genérica; a paginação futura (backlog 2.4) briga com esse modelo.

### Rota

`app/(dashboard)/dashboard/pedidos/[id]/page.tsx`:

- Ownership: `prisma.quoteRequest.findFirst({ where: { id, providerId } , include: ... })`,
  senão `notFound()`. Mesmo `include` que a lista usa hoje (service, proposal,
  statusHistory, internalNotes).
- Breadcrumb "← Pedidos" para `/dashboard/pedidos`.
- Corpo: os mesmos blocos do card expandido, via componentes compartilhados.

### Extração de componentes (a parte trabalhosa)

**Revisado na implementação (2026-07-09):** em vez de 7 arquivos de seção,
extrair **um único** `components/quote-request/QuoteRequestDetails.tsx` com
todo o conteúdo expandido do card (contato, agendamento, descrição, proposta,
Pix, histórico, notas), mantendo markup e comportamento idênticos. Card e
página de detalhe renderizam o mesmo componente — mesma reutilização, fração
do risco de regressão. A granularidade por seção só interessa à paginação
(backlog 2.4) e pode ser feita lá, se necessária.

Helpers compartilhados (`formatDate`, `formatDateShort`, `getInitials`,
`splitServiceFromDescription`, labels/badges de status) vão para
`components/quote-request/format.ts`; a serialização Decimal→string vai para
`components/quote-request/serialize.ts`, usada pela lista e pela página de
detalhe.

### Fase 1: accordion continua

O card da lista **mantém** o accordion (sem mudança de UX na lista); o conteúdo
expandido ganha o link "Abrir página do pedido ↗" para
`/dashboard/pedidos/{id}`. Remover o accordion fica para a paginação (2.4).

### Actions e redirects

- As actions usadas nas seções (status, notas, confirmar Pix) hoje fazem
  `revalidatePath("/dashboard/pedidos")` e/ou redirect fixo para a lista.
  Ganham um campo hidden opcional `returnTo`, **validado contra o prefixo
  `/dashboard/pedidos`** (nunca redirect aberto), para permanecer na página de
  detalhe após a ação. `revalidatePath` passa a cobrir ambas as rotas.

### E-mails

`createQuoteRequest` (e o e-mail novo da 1.1): `dashboardUrl` passa de
`/dashboard/pedidos` para `/dashboard/pedidos/{id}`.

### Testes

- Ownership da página (pedido de outro provider → 404) — teste de integração
  seguindo o padrão de `tests/integration/`.
- `returnTo` inválido cai no default — teste das actions alteradas.
- Os testes existentes do card continuam passando após a extração (critério de
  regressão).

---

## Fora de escopo (registrado para não escapar)

- Paginação da lista de pedidos (backlog 2.4) e remoção do accordion.
- Página de detalhe da proposta (roadmap curto prazo).
- Qualquer mudança de preço/planos.
