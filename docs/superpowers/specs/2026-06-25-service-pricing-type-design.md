# Design: Tipos de precificação de serviço (FIXED / CUSTOM)

**Data:** 2026-06-25
**Status:** Aprovado para implementação

---

## Problema

Todo pedido no OrçaFácil hoje exige criação de proposta manual. Para serviços com preço fixo, isso é desnecessário: o prestador já sabe o valor e o cliente só precisa solicitar o serviço.

---

## Objetivo

Permitir que o prestador classifique cada serviço como **preço fixo (FIXED)** ou **sob orçamento (CUSTOM)**, e que o sistema adapte o fluxo público e o painel de pedidos de acordo.

---

## Fora do escopo

- Pagamento, Pix, checkout do cliente final
- Cancelamento ou agenda/reserva
- Alteração no Stripe de assinatura
- Alteração no Auth.js
- Snapshot de preço no momento do pedido
- Refatoração de módulos não relacionados

---

## Schema

### Novo enum

```prisma
enum ServicePricingType {
  FIXED
  CUSTOM
}
```

### Campo adicionado em `Service`

```prisma
pricingType ServicePricingType @default(CUSTOM)
```

`basePrice` continua `Decimal?`. A validação de negócio (FIXED exige basePrice > 0) fica no Zod, não no banco.

### Migration

Nome: `add_service_pricing_type`
Operação: adicionar enum + coluna com default. Aditiva, sem impacto em dados existentes.

---

## Regras de negócio

| Situação | Regra |
|----------|-------|
| `pricingType = FIXED` | `basePrice` obrigatório e > 0 |
| `pricingType = CUSTOM` | `basePrice` opcional |
| Serviços antigos (sem pricingType) | Ficam como `CUSTOM` pelo default do banco |
| Proposta | Pode ser criada para qualquer tipo de pedido |

---

## Comportamento por pricingType

### Serviço FIXED

| Camada | Comportamento |
|--------|---------------|
| Cadastro | Exige `basePrice > 0`; toggle indica "Preço fixo" |
| Página pública `/u/[slug]` | Mostra preço em BRL; CTA "Solicitar serviço →" |
| Formulário `/u/[slug]/orcamento?serviceId=` | Título "Solicitar serviço"; mostra preço; campo de descrição opcional; botão "Solicitar serviço" |
| Painel de pedidos | Badge "Preço fixo" + valor; CTA "Criar proposta" aparece como ação secundária (não primária) |

### Serviço CUSTOM

| Camada | Comportamento |
|--------|---------------|
| Cadastro | `basePrice` opcional; toggle indica "Sob orçamento" |
| Página pública `/u/[slug]` | Mostra "Sob orçamento"; CTA "Pedir orçamento →" |
| Formulário `/u/[slug]/orcamento?serviceId=` | Título "Pedido de orçamento"; campo de descrição obrigatório; botão "Enviar pedido" |
| Painel de pedidos | Sem badge especial; CTA "Criar proposta" primário (comportamento atual) |

---

## Formulário público — adaptação de linguagem

A adaptação de linguagem acontece no **servidor** (SSR) com base no `serviceId` da query.

- Se `selectedServiceId` aponta para serviço FIXED → linguagem de solicitação
- Se `selectedServiceId` aponta para serviço CUSTOM ou nenhum serviço selecionado → linguagem de orçamento

Não há adaptação dinâmica via client-side ao mudar o select. O CTA nos cards da página pública já inclui `?serviceId=`, então o carregamento inicial já tem a linguagem correta.

---

## Tipos afetados

```ts
// types/service.ts

ServiceSummary:   { id, name, pricingType, basePrice }
PublicService:    { id, name, description, basePrice, pricingType }
ServiceForClient: { id, name, description, basePrice, isActive, pricingType }
```

```ts
// types/quote-request.ts — service dentro de QuoteRequestWithRelations
service: { id, name, pricingType, basePrice } | null
```

---

## Arquivos criados / alterados

| Arquivo | Tipo |
|---------|------|
| `prisma/schema.prisma` | Alterado |
| `lib/validations/service.ts` | Alterado |
| `lib/actions/services.ts` | Alterado |
| `types/service.ts` | Alterado |
| `types/quote-request.ts` | Alterado |
| `components/services/ServiceForm.tsx` | Alterado |
| `components/services/ServiceList.tsx` | Alterado |
| `components/public/PublicServicesGrid.tsx` | Alterado |
| `app/u/[slug]/page.tsx` | Alterado |
| `app/u/[slug]/orcamento/page.tsx` | Alterado |
| `components/quote-request/QuoteRequestForm.tsx` | Alterado |
| `app/(dashboard)/dashboard/pedidos/page.tsx` | Alterado |
| `components/quote-request/QuoteRequestCard.tsx` | Alterado |
| `docs/DATABASE.md` | Alterado |
| `docs/AI_HANDOFF.md` | Alterado |

---

## Plano de implementação (ordem)

1. Schema + migration
2. `lib/validations/service.ts` — validação condicional
3. `lib/actions/services.ts` — persistir pricingType
4. Types
5. `ServiceForm` — toggle FIXED/CUSTOM
6. `ServiceList` — exibir tipo
7. `PublicServicesGrid` — preço vs "Sob orçamento" + CTA correto
8. `app/u/[slug]/page.tsx` — selecionar pricingType
9. `app/u/[slug]/orcamento/page.tsx` + `QuoteRequestForm` — linguagem por tipo
10. `app/(dashboard)/dashboard/pedidos/page.tsx` — incluir pricingType na query
11. `QuoteRequestCard` — badge + CTA diferenciado
12. Docs
13. lint + build + prisma validate + test

---

## Critérios de aceite

- [ ] Prestador cria serviço FIXED com preço → salva com pricingType FIXED
- [ ] Prestador tenta criar serviço FIXED sem preço → erro de validação
- [ ] Prestador cria serviço CUSTOM sem preço → salva com pricingType CUSTOM
- [ ] Serviços antigos (sem pricingType) continuam como CUSTOM
- [ ] `/u/[slug]` mostra preço em BRL para FIXED, "Sob orçamento" para CUSTOM
- [ ] CTA no card de serviço é "Solicitar serviço" para FIXED, "Pedir orçamento" para CUSTOM
- [ ] Formulário público com `?serviceId=` de serviço FIXED mostra linguagem de solicitação
- [ ] Formulário público com `?serviceId=` de serviço CUSTOM mantém linguagem de orçamento
- [ ] Painel mostra badge "Preço fixo" + valor para pedidos de serviços FIXED
- [ ] Painel mantém "Criar proposta" como primário apenas para pedidos CUSTOM
- [ ] Propostas existentes não são afetadas
- [ ] lint + build + prisma validate passam sem erros
