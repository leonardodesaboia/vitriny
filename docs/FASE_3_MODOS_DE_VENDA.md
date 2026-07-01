# Fase 3 — Modos de venda dos itens da vitrine

## Objetivo

Reorganizar somente a interface de criação e edição de itens para apresentar uma única pergunta:

> Como este item é vendido?

A implementação deve reaproveitar `pricingType` e `fixedServiceCheckoutMode`. Não deve alterar schema, migrations ou regras de negócio.

## Fora do escopo

- alterar `prisma/schema.prisma`;
- criar migration;
- alterar `lib/actions/quote-requests.ts`;
- alterar regras de Pix, propostas, pedidos, limites ou checkout;
- usar `itemType` para decidir o modo de venda;
- renomear models, rotas, arquivos ou campos técnicos;
- implementar estoque, frete, carrinho ou variações;
- alterar Stripe, Auth.js ou MinIO.

## Mapeamento obrigatório

| Estado de UI | Label | `pricingType` | `fixedServiceCheckoutMode` | `basePrice` |
|---|---|---|---|---|
| `CUSTOM` | Sob consulta | `CUSTOM` | `REQUEST_ONLY` | opcional |
| `FIXED_REQUEST` | Preço fixo, solicitar primeiro | `FIXED` | `REQUEST_ONLY` | obrigatório |
| `FIXED_PIX` | Preço fixo, pagar via Pix | `FIXED` | `REQUIRE_PIX_PAYMENT` | obrigatório |

Descrições:

- `CUSTOM`: “O cliente envia uma solicitação e você responde com uma proposta.”
- `FIXED_REQUEST`: “O cliente envia uma solicitação com os dados. Você confirma depois.”
- `FIXED_PIX`: “O cliente preenche os dados e recebe o Pix para pagar diretamente para você. A confirmação continua manual.”

Aviso adicional de `FIXED_PIX`:

> Requer dados Pix configurados no perfil. O pagamento é feito diretamente para você e a confirmação é manual.

## Compatibilidade com itens existentes

Ao abrir o formulário de edição, derivar o estado visual assim:

```text
pricingType = CUSTOM
  → saleMode = CUSTOM

pricingType = FIXED
fixedServiceCheckoutMode = REQUEST_ONLY
  → saleMode = FIXED_REQUEST

pricingType = FIXED
fixedServiceCheckoutMode = REQUIRE_PIX_PAYMENT
  → saleMode = FIXED_PIX
```

Se um registro `CUSTOM` possuir qualquer valor inesperado em `fixedServiceCheckoutMode`, a UI deve tratá-lo como `CUSTOM`. No submit, deve enviar `REQUEST_ONLY`.

Não limpar automaticamente `basePrice` ao selecionar `CUSTOM`. O preço base opcional já é suportado pelo sistema.

## Arquivos a criar

### `lib/service-sale-mode.ts`

Criar um helper puro com:

```ts
export type ServiceSaleMode = "CUSTOM" | "FIXED_REQUEST" | "FIXED_PIX";
```

Exportar, no mínimo:

```ts
getServiceSaleMode({ pricingType, fixedServiceCheckoutMode })
getTechnicalSaleMode(saleMode)
```

O primeiro converte os campos persistidos para o estado de UI. O segundo retorna um novo objeto com:

```ts
{
  pricingType: "CUSTOM" | "FIXED";
  fixedServiceCheckoutMode: "REQUEST_ONLY" | "REQUIRE_PIX_PAYMENT";
}
```

Também pode centralizar:

- ordem das três opções;
- labels;
- descrições;
- label compacta de badge.

Labels compactas:

- `CUSTOM`: `Sob consulta`;
- `FIXED_REQUEST`: `Preço fixo · Solicitação`;
- `FIXED_PIX`: `Preço fixo · Pix`.

### `tests/unit/service-sale-mode.test.ts`

Testar os dois sentidos do mapeamento:

1. `CUSTOM + REQUEST_ONLY → CUSTOM`;
2. `CUSTOM + REQUIRE_PIX_PAYMENT → CUSTOM` como normalização defensiva;
3. `FIXED + REQUEST_ONLY → FIXED_REQUEST`;
4. `FIXED + REQUIRE_PIX_PAYMENT → FIXED_PIX`;
5. `CUSTOM → CUSTOM + REQUEST_ONLY`;
6. `FIXED_REQUEST → FIXED + REQUEST_ONLY`;
7. `FIXED_PIX → FIXED + REQUIRE_PIX_PAYMENT`;
8. labels aprovadas.

## Arquivos a alterar

### `components/services/ServiceForm.tsx`

1. Remover os estados visuais separados `pricingType` e `checkoutMode`.
2. Criar um único estado `saleMode`.
3. Inicializar `saleMode` usando `getServiceSaleMode` e os dados do item existente.
4. Derivar `pricingType` e `fixedServiceCheckoutMode` com `getTechnicalSaleMode`.
5. Manter os hidden inputs existentes, mas preencher seus valores derivados.
6. Manter o hidden input de `itemType` independente.
7. Substituir a seção “Precificação” e o toggle “Exigir pagamento via Pix” por três cards sob o título “Como este item é vendido?”.
8. Cada card deve ser um `button type="button"` com `aria-pressed`.
9. Exibir label e descrição completa em cada card.
10. Exibir o aviso adicional quando `saleMode === "FIXED_PIX"`.
11. Considerar preço fixo quando `saleMode !== "CUSTOM"`.
12. Para preço fixo, manter `basePrice` obrigatório visualmente e manter a validação server-side atual.
13. Para `CUSTOM`, manter `basePrice` opcional e com a indicação de referência interna.
14. Não limpar o valor do input ao alternar modos.
15. Não alterar `requiresSchedulingDetails`, upload de imagem, visibilidade ou `itemType`.

O submit deve produzir somente estas combinações:

```text
CUSTOM       → CUSTOM + REQUEST_ONLY
FIXED_REQUEST → FIXED + REQUEST_ONLY
FIXED_PIX     → FIXED + REQUIRE_PIX_PAYMENT
```

### `components/services/ServiceItem.tsx`

Substituir o badge atual baseado apenas em `pricingType` pelo badge derivado do modo de venda:

- Sob consulta;
- Preço fixo · Solicitação;
- Preço fixo · Pix.

Manter separado o badge Produto/Serviço.

### `components/quote-request/QuoteRequestCard.tsx`

Substituir o badge genérico “Preço fixo” pelo badge do modo de venda, quando houver item vinculado:

- Sob consulta;
- Preço fixo · Solicitação;
- Preço fixo · Pix.

Não alterar a lógica que permite proposta somente quando `pricingType !== FIXED`.

Não alterar a seção de confirmação manual do Pix.

### `components/public/PublicServicesGrid.tsx`

Manter a lógica atual de decisão do CTA e alterar somente a copy necessária:

- `CUSTOM`: `Solicitar orçamento →`;
- `FIXED + REQUEST_ONLY`: `Solicitar →`;
- `FIXED + REQUIRE_PIX_PAYMENT`: `Pagar com Pix →`;
- Pix não configurado: manter `Pagamento temporariamente indisponível`.

Não usar `itemType` nessa decisão.

### `components/quote-request/QuoteRequestForm.tsx`

Alterar somente copy:

- item `FIXED` sem Pix: botão `Solicitar`;
- Pix obrigatório: botão `Continuar para pagar com Pix →`;
- `CUSTOM`: manter `Enviar pedido` ou alinhar para `Solicitar orçamento`, desde que o fluxo permaneça igual.

Não alterar os campos enviados nem a obrigatoriedade da descrição.

### Documentação

Atualizar:

- `README.md`;
- `docs/MVP_FLOW.md`;
- `docs/AI_HANDOFF.md`.

Registrar que os três modos são apenas uma representação de UI dos campos existentes e não um novo campo persistido.

## Arquivos que não devem ser alterados

- `prisma/schema.prisma`;
- qualquer arquivo em `prisma/migrations/`;
- `lib/actions/quote-requests.ts`;
- `lib/actions/services.ts`, salvo se surgir uma necessidade comprovada — a action atual já normaliza `CUSTOM` para `REQUEST_ONLY`;
- `lib/validations/service.ts`;
- arquivos de Stripe, Auth.js, MinIO, Proposal ou ProposalItem.

## Regras que devem continuar verdadeiras

1. `CUSTOM` exige descrição no pedido público.
2. `FIXED` permite descrição opcional.
3. `FIXED` exige `basePrice` válido no servidor.
4. `CUSTOM` aceita `basePrice` vazio.
5. `FIXED_PIX` exige dados Pix configurados, validados pela action existente.
6. Pix continua manual e pago diretamente ao negócio.
7. Apenas o fluxo Pix grava `fixedServiceAmount` e `pixReservationRequestedAt`.
8. `CUSTOM` continua elegível para proposta, tanto em Produto quanto Serviço.
9. `itemType` não interfere em nenhuma regra de venda.
10. Itens antigos abrem no modo visual correspondente aos campos já persistidos.

## Ordem de implementação

1. Criar o teste unitário do helper e confirmar RED.
2. Criar `lib/service-sale-mode.ts` e confirmar GREEN.
3. Alterar `ServiceForm` para usar um único `saleMode`.
4. Confirmar via teste/manual que os hidden inputs geram apenas as três combinações válidas.
5. Atualizar badges em `ServiceItem` e `QuoteRequestCard`.
6. Atualizar CTAs em `PublicServicesGrid` e copy de `QuoteRequestForm`.
7. Atualizar documentação.
8. Rodar verificações.

## Teste manual

### Sob consulta

1. Criar Produto + Sob consulta.
2. Criar Serviço + Sob consulta.
3. Confirmar badge `Sob consulta`.
4. Confirmar CTA `Solicitar orçamento`.
5. Confirmar descrição obrigatória no pedido.
6. Confirmar criação de proposta disponível.

### Preço fixo, solicitar primeiro

1. Criar Produto + modo de solicitação.
2. Criar Serviço + modo de solicitação.
3. Confirmar que preço é obrigatório.
4. Confirmar badge `Preço fixo · Solicitação`.
5. Confirmar CTA `Solicitar`.
6. Confirmar sucesso sem redirect para Pix.
7. Confirmar que proposta não é necessária.

### Preço fixo, pagar via Pix

1. Configurar dados Pix no perfil.
2. Criar Produto + Pix.
3. Criar Serviço + Pix.
4. Confirmar que preço é obrigatório.
5. Confirmar badge `Preço fixo · Pix`.
6. Confirmar CTA `Pagar com Pix`.
7. Enviar pedido e confirmar redirect para `/reserva/[requestId]`.
8. Confirmar `fixedServiceAmount` e `pixReservationRequestedAt`.
9. Confirmar que o recebimento continua manual.

### Compatibilidade

Editar um item existente de cada combinação e confirmar que o card correto inicia selecionado sem alterar seus dados ao salvar.

## Verificações obrigatórias

```bash
npm test
npm run test:integration
npm run lint
npm run build
npx prisma validate
git diff --check
```

Também confirmar no diff:

- nenhum arquivo Prisma alterado;
- nenhuma migration criada;
- nenhuma condição de negócio nova baseada em `itemType`;
- nenhuma alteração em `lib/actions/quote-requests.ts`;
- nenhuma alteração em Proposal/ProposalItem.

## Critérios de aceite

- O formulário mostra exatamente três modos de venda.
- Os campos técnicos enviados correspondem à tabela de mapeamento.
- Não existem combinações inválidas no submit.
- Itens existentes abrem no modo correto.
- Produto/Serviço permanece independente.
- Preço e Pix continuam validados no servidor.
- CTAs e badges usam a linguagem aprovada.
- Todos os testes e verificações passam.
- Não há mudança de schema, migration ou regra de negócio.
