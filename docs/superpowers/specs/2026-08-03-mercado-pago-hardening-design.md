# Mercado Pago — Hardening da assinatura PRO (pós-migração) Design

> Contexto: `docs/MERCADO_PAGO.md` documenta o estado da migração Stripe→MP e os achados da investigação de Pix. Este spec cobre as pendências levantadas lá, **exceto o cutover** (Task 12 do plano original — remoção do código Stripe/Pix-manual), que fica fora de escopo até validação em produção.

## Objetivo

Fechar os gaps identificados após a migração inicial: semântica de cancelamento incompleta, ausência de trava contra assinatura duplicada, webhook que não cobre o fluxo de Pix por plano nem atualiza `subscriptionStatus`, `mpPayerId` nunca gravado, reativação e faturas ainda presas ao Stripe.

## Não-objetivos

- Cutover (remoção de Stripe/Pix-manual) — fica para depois de validar MP em produção.
- Habilitar Pix Automático na conta MP — depende de aprovação do próprio Mercado Pago (gate externo), fora do controle do código.
- Dedupe de eventos de webhook via tabela própria — os handlers já são idempotentes por natureza (reaplicar o mesmo status é no-op); decisão deliberada de não adicionar infraestrutura para isso.

## A. Cancelamento com acesso até o fim do período

Hoje `cancelMpSubscription` cancela a preapproval no MP mas não seta `cancelAtPeriodEnd`, deixando a UI (que já espera esse campo) inconsistente com o comportamento real.

**Comportamento novo:**
- `cancelMpSubscription` chama `preapproval.update({ status: "cancelled" })` no MP imediatamente (parada de cobrança futura — cancelamento de preapproval é terminal no MP, não é reversível).
- Localmente **não** rebaixa o plano na hora: grava `cancelAtPeriodEnd: true` e `subscriptionStatus: "CANCELED"`, mantendo `plan: "PRO"`, `currentPeriodEnd` e `mpPreapprovalId` como estão.
- O rebaixamento real acontece via expiração lazy (seção B) quando `currentPeriodEnd` passar.

**Reativação (`cancelAtPeriodEnd === true`, ainda dentro do período):**
Como a preapproval cancelada é terminal no MP, não existe "descancelar". Reativar = assinar de novo. A UI troca o botão "Reativar assinatura" para reabrir `MpSubscriptionModal` (mesmo fluxo do Card Brick) quando a assinatura ativa é MP — gera um novo `card_token`, chama `createMpCardSubscription` de novo, que cria uma nova preapproval `authorized` e sobrescreve `mpPreapprovalId`/`currentPeriodEnd`/`cancelAtPeriodEnd: false`. Isso cobra um novo ciclo imediatamente; o texto da UI deve deixar isso claro. O caminho Stripe (`reactivateSubscription`, zero-input) continua intacto para assinantes legados — `BillingCard` decide qual caminho usar olhando se a assinatura ativa tem `mpPreapprovalId` ou `stripeSubscriptionId`.

`loadSubscribableProfile` (guard de `createMpCardSubscription`) precisa permitir criar uma nova preapproval quando `plan === "PRO" && cancelAtPeriodEnd === true` (hoje bloqueia qualquer PRO com `mpPreapprovalId` presente).

## B. Expiração lazy considera cancelamento agendado

`isOneTimeProExpired` (`lib/plan-limits.ts`) hoje só expira PRO quando **nenhuma** assinatura existe (`stripeSubscriptionId` e `mpPreapprovalId` ambos `null`). Passa a expirar também quando:

```
plan === "PRO" && currentPeriodEnd !== null && currentPeriodEnd < now && (
  cancelAtPeriodEnd === true ||
  (stripeSubscriptionId === null && mpPreapprovalId === null)
)
```

`resolveEffectivePlan` (`lib/effective-plan.ts`), ao expirar, além de zerar `plan`/`currentPeriodEnd`, também zera `mpPreapprovalId` e `cancelAtPeriodEnd` e seta `subscriptionStatus: null`. `EffectivePlanInput` e o `select` de `auth-guard.ts` precisam incluir `cancelAtPeriodEnd`.

## C. Trava contra assinatura duplicada

Campo novo em `ProviderProfile`: `mpSubscriptionLockedAt DateTime?`.

Fluxo em `createMpCardSubscription` (cobre tanto assinar quanto reativar, que usam a mesma action):
1. `updateMany` condicional: `where: { id, OR: [{ mpSubscriptionLockedAt: null }, { mpSubscriptionLockedAt: { lt: twoMinutesAgo } }] }`, `data: { mpSubscriptionLockedAt: now }`.
2. Se `count !== 1`, retorna erro "Já existe uma tentativa de assinatura em andamento. Aguarde um instante e tente novamente." sem chamar o MP.
3. Ao final (sucesso ou erro após esse ponto), limpa o lock: `mpSubscriptionLockedAt: null` — incluído no mesmo `update` que já persiste o resultado, e no branch de erro/compensação existente.
4. Lock órfão (processo caiu no meio) expira sozinho em 2 minutos — mesmo padrão "sem cron, corrige na leitura/escrita seguinte" que o resto do projeto usa.

`deleteAccount` (`lib/actions/account.ts`) passa a checar esse lock antes de prosseguir: se `mpSubscriptionLockedAt` estiver setado e dentro da janela de 2 min, aborta com "Uma operação de assinatura está em andamento, tente novamente em instantes." — evita cancelar uma preapproval que está sendo criada nesse exato momento.

## D. Webhook — hardening pontual

Em `app/api/mercadopago/webhook/route.ts`:

- **`subscriptionStatus` passa a ser mantido em toda transição resolvida** (hoje só é setado na criação via `mp-billing.ts`; o webhook nunca escreve nesse campo).
- **Cancelamento chegando via webhook usa a mesma lógica soft da seção A**: em vez de zerar `mpPreapprovalId`/`currentPeriodEnd` na hora quando `resolvePlanFromPreapproval` retorna `FREE` por `cancelled`, o webhook seta `cancelAtPeriodEnd: true` e `subscriptionStatus: "CANCELED"`, deixando `plan` como está — cobre o caso de o usuário cancelar direto no app do MP em vez de pelo botão do Vitriny. `paused` continua causando rebaixamento imediato (não é o mesmo caso de uso; mantém o comportamento atual).
- **Novos tópicos para o fluxo de Pix por plano** (seção E): `subscription_authorized_payment` e `payment`. Ao receber, busca o recurso (`payment.get` ou preapproval associada), resolve `external_reference`. Se o perfil casado por `external_reference` ainda não tem `mpPreapprovalId`, grava o id retornado pelo evento — é o único jeito de capturar a preapproval quando ela nasce do checkout do plano (o Vitriny não a cria via API, só redireciona).

## E. Pix por plano (`preapproval_plan`) — implementado atrás de env

Conforme achado documentado em `docs/MERCADO_PAGO.md` (probe real no sandbox): Pix só aparece em checkout de assinatura via `preapproval_plan` com `payment_methods_allowed`, e a criação do plano em si é uma chamada única (`POST /preapproval_plan`) feita manualmente — fica documentada como passo operacional, não como código.

- `createMpPixSubscription(payerEmail)` passa a checar `process.env.MP_PRO_PLAN_INIT_POINT` — o `init_point` **completo** devolvido pela API no momento em que o `preapproval_plan` for criado manualmente (passo operacional, documentado no MERCADO_PAGO.md; não adivinhamos domínio/formato de URL no código). Se ausente (caso do ambiente atual), mantém o comportamento de hoje (erro "Pix Automático ainda não está disponível"). Se presente, retorna essa URL com `external_reference=${profile.id}` anexado como query param, para redirect — não cria nada via API (a preapproval nasce quando o pagador completa o checkout do MP).
- Sem `MP_PRO_PLAN_INIT_POINT` configurado em nenhum ambiente hoje, este código fica inerte — zero risco de regressão.
- Webhook: seção D cobre a confirmação assíncrona via `external_reference`.
- UI: o botão "Assinar com Pix" continua condicionado a essa mesma env estar presente (mantém oculto até o gate de conta liberar e alguém configurar `MP_PRO_PLAN_INIT_POINT`).

## F. `mpPayerId`

`createMpCardSubscription` passa a gravar `mpPayerId: result.payer_id` (quando presente) no mesmo `update` que já persiste `mpPreapprovalId`. Sem fluxo novo.

## G. Faturas Mercado Pago na tela de billing

A rota `/api/billing/invoices` hoje busca só faturas Stripe e devolve `InvoiceItem[]` (`components/billing/InvoiceList.tsx`: `{ id, created, amountPaid, currency, status, hostedUrl }`). Passa a também buscar pagamentos MP via `payment.search` (filtro por `external_reference` = id do perfil), mapear para o mesmo formato (`hostedUrl` pode ficar `null` se o SDK não expuser um link de recibo) e mesclar com as faturas Stripe ordenadas por data. Nenhuma mudança de UI — só a fonte de dados na rota.

## Testes

TDD por unidade de mudança, seguindo o padrão já usado no projeto (`tests/unit/*`, `tests/actions/*`, SDK do MP mockado):
- `isOneTimeProExpired` / `resolveEffectivePlan`: casos com `cancelAtPeriodEnd` true/false combinados com período vencido/válido e com/sem `mpPreapprovalId`.
- `mp-billing.test.ts`: cancelamento seta `cancelAtPeriodEnd`; reativação permitida quando `cancelAtPeriodEnd === true`; trava de lock (tentativa concorrente retorna erro sem chamar o MP mockado); `mpPayerId` persistido; `createMpPixSubscription` com e sem `MP_PRO_PLAN_ID`.
- Webhook: cancelamento não zera `mpPreapprovalId` na hora; `subscription_authorized_payment`/`payment` casando por `external_reference`; `subscriptionStatus` atualizado.
- `deleteAccount`: aborta quando lock ativo.
- Rota de invoices: mescla Stripe + MP, mapeamento correto do formato.

## Rollout

Sem migração de dados além do novo campo `mpSubscriptionLockedAt` (nullable, sem default relevante). Nenhuma env nova obrigatória — `MP_PRO_PLAN_INIT_POINT` é opcional e o comportamento atual (Pix bloqueado) é preservado até alguém configurá-la depois que o Mercado Pago liberar o Pix Automático para a conta.
