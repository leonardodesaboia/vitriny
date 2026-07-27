# Design — Botão "Já paguei" na reserva Pix

Data: 2026-07-09
Origem: `docs/BACKLOG_TECNICO.md` seção 1.1 (⭐ recomendado como próximo passo)
Status: aprovado pelo usuário

## Problema

O ciclo do Pix obrigatório depende de o cliente avisar por fora (WhatsApp). Se ele
paga e não avisa, o negócio não tem sinal nenhum no painel. Esta feature dá ao
cliente um botão "Já fiz o pagamento" na página de reserva; o sinal aparece como
badge no painel de pedidos, como sub-contagem na dashboard e como e-mail ao negócio.

O sinal é **informativo**: cliente pode marcar sem pagar. A confirmação continua
manual, pelo negócio (`markPixReservationPaid`). Os textos deixam isso claro.

## Decisões tomadas no brainstorm

- **Abordagem A**: Server Action pública + `<form>`, seguindo a convenção do app
  (`createQuoteRequest`). Sem route handler REST, sem sinal via `statusHistory`.
- **E-mail ao negócio**: sim, via `after()`.
- **Sub-contagem na dashboard**: sim, nesta entrega.
- **Precedência na página do cliente**: pago > informado > expirado > pendente.
  Se o cliente informou e o prazo venceu depois, a página mostra "informado" —
  o dinheiro possivelmente já saiu; a bola está com o negócio.
- **View do painel**: reserva expirada-mas-informada volta a ser acionável —
  entra na view `PIX_RESERVATION` e na contagem de pendências da dashboard.

## 1. Schema

`prisma/schema.prisma`, model `QuoteRequest`, ao lado dos timestamps Pix existentes:

```prisma
pixReservationClientPaidAt DateTime?
```

Migração aditiva (`add_pix_reservation_client_paid_at`), sem backfill — estado novo.

## 2. Server Action pública

`lib/actions/quote-requests.ts`:

```ts
export async function markPixReservationClientPaid(
  slug: string,
  formData: FormData
): Promise<void>
```

Chamada por `<form>` na página de reserva (`requestId` em hidden input, `slug`
via bind — mesmo padrão do `createQuoteRequest`). O cliente não tem login; a
segurança vem das validações, em ordem:

1. Perfil existe pelo `slug` (**sem** exigir `isPublished` — coerente com a
   página de reserva: despublicar a vitrine não mata pagamento em andamento).
2. Pedido existe com `id = requestId` e `providerId = profile.id`, e
   `pixReservationRequestedAt` preenchido. Senão, redirect.
3. `pixReservationPaidAt` já preenchido → redirect sem tocar em nada.
4. Reserva expirada (`isPixPaymentExpired`) → redirect sem gravar.
5. `pixReservationClientPaidAt` já preenchido → redirect sem regravar
   (idempotência: segundo clique não erra).
6. Grava `pixReservationClientPaidAt = new Date()`.
7. `after()`: envia e-mail ao negócio (seção 6). Falha só loga `console.error`.
8. `revalidatePath` da página de reserva e do `/dashboard/pedidos`.

Todos os caminhos (sucesso e "nada a fazer") terminam igual: redirect para
`/u/[slug]/reserva/[requestId]`, que renderiza o estado real.

## 3. UI da página de reserva

`app/u/[slug]/reserva/[requestId]/page.tsx` — buscar também
`pixReservationClientPaidAt` e derivar estados com precedência
**pago > informado > expirado > pendente**:

- **Pendente**: mantém QR/copia-e-cola/próximos passos; adiciona o botão
  "Já fiz o pagamento" (client component `MarkPaidForm` na pasta da rota, como o
  `CopyPixButton`, com loading via `useFormStatus`), abaixo do bloco
  "Próximos passos", mantendo o botão de WhatsApp.
- **Informado** (novo): QR e copia-e-cola saem de cena; no lugar do bloco
  "Próximos passos", card "Pagamento informado — aguardando confirmação do
  negócio", com o botão de WhatsApp mantido (enviar comprovante).
- **Expirado** e **Pago**: inalterados.

## 4. Painel de pedidos

`components/quote-request/QuoteRequestCard.tsx`:

- Badge do Pix ganha o estado `clientPaidAt && !paidAt` → **"Cliente informou
  pagamento"** (âmbar forte, distinto do "Pagamento Pix pendente"), com
  prioridade sobre "Pix expirado".
- Bloco expandido do Pix mostra a data em que o cliente informou.

`lib/dashboard.ts` + página de pedidos:

- `matchesDashboardRequestView`, case `PIX_RESERVATION`: passa a incluir
  expiradas quando `pixReservationClientPaidAt !== null`:
  `requested && !paid && (!expired || clientPaid)`.
- Nova função pura de ordenação: na view `PIX_RESERVATION`, informados primeiro
  (estável em relação à ordem existente nos demais casos).

## 5. Dashboard

`app/(dashboard)/dashboard/page.tsx`:

- A contagem "Pagamentos Pix para confirmar" passa a usar
  `OR: [{ pixReservationRequestedAt: { gte: pixExpiryCutoff } }, { pixReservationClientPaidAt: { not: null } }]`
  (com `pixReservationPaidAt: null`), ficando consistente com a view.
- Novo `count` na `$transaction` existente: mesmas condições +
  `pixReservationClientPaidAt: { not: null }`. Exibido como sub-descrição do
  card de pendência: "N informado(s) pelo cliente" quando N > 0.

## 6. E-mail

`lib/email.ts`, no padrão dos existentes:

```ts
sendPixReservationClientPaidEmail({
  to, businessName, customerName, serviceName, amount, dashboardUrl
})
```

Assunto: "Cliente informou pagamento Pix — Vitriny". Corpo: "Fulano informou o
pagamento Pix de R$ X referente ao item {nome}. Confirme o recebimento no seu
banco antes de dar o pedido como pago." Botão → `/dashboard/pedidos`.

## 7. Rate limit

`proxy.ts`:

- Nova regra `"/u/reserva": { limit: 10, windowMs: 60_000 }` com match por regex
  `^\/u\/[^/]+\/reserva\//` (mesmo tratamento especial da regra `/u/orcamento`).
- Adicionar `"/u/:slug/reserva/:requestId"` ao `config.matcher`.

## 8. Testes

- **Action** (`tests/actions/quote-requests.test.ts`, seguindo o padrão existente):
  slug de outro perfil rejeita; pedido sem reserva rejeita; expirada não grava;
  já paga (pelo negócio) não regrava; segundo clique é no-op sem erro; sucesso
  grava timestamp e agenda o e-mail.
- **Unit** (`tests/unit/dashboard.test.ts`): `PIX_RESERVATION` inclui
  expirada-informada e continua excluindo expirada-não-informada; ordenação
  coloca informados primeiro.
- Badge: coberto pelos testes unitários da função de estado se extraída; sem
  E2E novo nesta entrega (E2E dos fluxos de dinheiro é item 6 do backlog).

## Fora de escopo

- Confirmação automática de pagamento (gateway) — futuro distante no roadmap.
- Reabrir/estender reserva expirada — item 2.5 do backlog.
- Notificação ao cliente quando o negócio confirmar — não solicitado.
