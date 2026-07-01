# AI Handoff

## Resumo rápido

Vitriny é uma vitrine online para pequenos negócios apresentarem produtos e serviços, receberem pedidos, enviarem propostas por link e oferecerem pagamento via Pix manual.

## Glossário técnico ↔ UI

Esta tabela é obrigatória de consultar antes de qualquer alteração de linguagem ou sugestão de refatoração.

| Termo técnico (código/banco) | Termo de UI (interface/usuário) | Observação |
|---|---|---|
| `Service` | item da vitrine | Não renomear o model |
| `Service.itemType` | Produto / Serviço | Classificação visual apenas |
| `QuoteRequest` | pedido / solicitação | Não renomear o model |
| `ProviderProfile` | perfil do negócio / vitrine pública | Não renomear o model |
| `ProviderProfile.slug` | endereço da vitrine | `/u/[slug]` |
| `pricingType = CUSTOM` | Sob consulta | |
| `pricingType = FIXED` | Preço fixo | |
| `fixedServiceCheckoutMode = REQUEST_ONLY` | Preço fixo, solicitar primeiro | |
| `fixedServiceCheckoutMode = REQUIRE_PIX_PAYMENT` | Preço fixo, pagar via Pix | |
| `ServiceSaleMode` (helper de UI) | modo de venda | Não existe no banco |
| `Proposal` | proposta | |
| `ProposalItem` | item da proposta | |
| `/dashboard/servicos` | gerenciamento de itens da vitrine | Rota técnica/legada |
| `/u/[slug]/orcamento` | formulário de pedido público | Rota técnica/legada |

Rotas, models, enums e nomes de arquivo mantêm a nomenclatura técnica original. A interface usa linguagem ampla de "vitrine", "item" e "pedido". `itemType` não participa de regras de Pix, proposta, pedidos, checkout ou limites; essas regras continuam em `pricingType` e `fixedServiceCheckoutMode`.

---

## O que NÃO fazer neste produto sem decisão explícita

Esta seção existe como guardrail explícito. IAs não devem propor nem implementar os itens abaixo sem confirmação humana de que houve uma decisão de produto.

**Schema / banco:**
- Não renomear `Service` para `Product`, `CatalogItem`, `Item` ou qualquer outro nome.
- Não criar `Product` como model separado de `Service`.
- Não separar "produtos" e "serviços" em dois models distintos no banco.
- Não adicionar campos de estoque, SKU, variações ou frete sem decisão explícita.

**Fluxo de compra:**
- Não implementar carrinho de compras.
- Não implementar checkout automático do cliente final.
- Não implementar confirmação automática de pagamento Pix.
- Não usar Stripe para pagamento do cliente final (Stripe é exclusivo para assinatura do usuário da Vitriny).
- Não implementar variações de produto (cor, tamanho, etc.).
- Não implementar cupons ou desconto automático.

**Escala:**
- Não implementar marketplace de múltiplos vendedores.
- Não implementar multiempresa complexo com permissões.
- Não implementar catálogo público geral fora do `/u/[slug]`.

**Integrações:**
- Não implementar WhatsApp API (gateway automático).
- Não implementar gateway Pix com confirmação automática.
- Não implementar frete com cálculo automático.

**O Vitriny é uma vitrine online — não um e-commerce completo. Estas features podem ser consideradas no futuro, somente após validação de negócio.**

O MVP principal está implementado.

## Mudanças recentes

### Fases de transição — linguagem e UI

**Fase 1 — Linguagem ampla de itens da vitrine**
- Ajuste de linguagem na UI: "serviços" → "itens da vitrine", "produtos e serviços", "vitrine pública", "pedidos" e "pagamento Pix". Nenhuma mudança de schema, models ou nomes técnicos.

**Fase 2 — `itemType`: `PRODUCT` e `SERVICE`**
- Adição do campo `Service.itemType` com enum `CatalogItemType` (`PRODUCT` | `SERVICE`). Padrão: `SERVICE` para compatibilidade com itens antigos.
- `itemType` é classificação visual e organizacional; não altera preço, Pix, propostas, pedidos, limites nem checkout.
- Migration versionada.

**Fase 3 — `saleMode`: modos de venda na UI**
- Criação de `lib/service-sale-mode.ts` com `ServiceSaleMode` e os helpers `getServiceSaleMode` / `getTechnicalSaleMode`.
- Três modos de venda na UI: `CUSTOM` (Sob consulta), `FIXED_REQUEST` (Preço fixo, solicitar primeiro), `FIXED_PIX` (Preço fixo, pagar via Pix).
- `ServiceForm` usa um único estado `saleMode`; badges e CTAs atualizados. Nenhuma mudança de schema, banco ou actions.

**Fase 4 — Documentação canônica**
- Atualização da documentação para posicionar a Vitriny como vitrine online para produtos e serviços.
- Adição de glossário técnico↔UI, guardrails anti-e-commerce e mapa completo das fases.

### Mudanças técnicas anteriores

- a tela de billing deixou de buscar faturas da Stripe no carregamento inicial; agora a página renderiza e o card de faturas faz fetch assíncrono em `/api/billing/invoices` via `components/billing/AsyncInvoiceList.tsx`;
- a aplicação ganhou temas globais por preset em `lib/theme-presets.ts` + `app/globals.css`, com a regra centralizada em `getPublicThemePreset(plan, savedPreset)`: `PRO` usa o preset salvo e `FREE` sempre cai em `DEFAULT`;
- os temas alteram apenas tokens globais de cor e fonte via `data-brand-theme`; não trocam layout ou classes específicas por componente; presets atuais: `DEFAULT`, `CLEAN`, `BEAUTY`, `CREATIVE`, `PREMIUM` e `BOLD`;
- o formulário de perfil ganhou a seção “Aparência da página”; usuários `FREE` veem apenas o tema padrão e o aviso de upgrade, enquanto `PRO` escolhem entre os presets;
- o card de link público do onboarding passou a registrar, em `localStorage`, quando o usuário copiou ou abriu o link, para que o checklist reflita a ação real;
- cards e listas de pedidos/serviços foram ajustados para lidar melhor com nomes longos, layout fixo e leitura em desktop e mobile; `/dashboard/servicos` usa `min-w-0`, contenção de overflow e inputs `w-full` para evitar quebra horizontal em telas como iPhone 12 Pro;
- `/dashboard/pedidos` ganhou filtro por status via query string `?status=NEW|REVIEWING|PROPOSAL_SENT|CLOSED`, com contador por aba e fallback para `Todos` quando o status é inválido;
- `/dashboard` usa agregações do Prisma para métricas mensais e pendências; o onboarding final varia entre serviços `CUSTOM`, `FIXED` ou uma combinação dos dois;
- os cards da dashboard abrem `/dashboard/pedidos` com filtros por status ou com as visões `?view=MONTH|OPEN|APPROVED_MONTH|PIX_RESERVATION|DEPOSIT`;
- a dashboard combina os cinco eventos mais recentes entre novos pedidos, propostas enviadas/aprovadas/recusadas, pagamentos Pix confirmados e entradas confirmadas;
- serviços `FIXED` em `REQUIRE_PIX_PAYMENT` criam o snapshot `fixedServiceAmount` e redirecionam obrigatoriamente para `/u/[slug]/reserva/[requestId]`; `REQUEST_ONLY` nunca redireciona ao Pix;
- a documentação e o schema passaram a registrar o novo campo `ProviderProfile.themePreset`, a enum `ProviderThemePreset` e a migration correspondente.

## Estado atual

Funciona hoje:

- login com Google OAuth e e-mail/senha (cadastro, login, recuperação de senha);
- dashboard protegido;
- perfil do negócio / vitrine pública;
- **itens da vitrine** com classificação `itemType` (`PRODUCT` ou `SERVICE`): classificação visual, sem efeito em regras de negócio;
- **modos de venda (`saleMode`)**: Sob consulta, Preço fixo solicitar primeiro, Preço fixo pagar via Pix — abstrações de UI centralizadas em `lib/service-sale-mode.ts`;
- itens com tipos de preço (`FIXED` / `CUSTOM`): FIXED exige `basePrice`, exibido publicamente; CUSTOM fica sob orçamento;
- itens com `requiresSchedulingDetails` (Boolean, default false): quando true, data futura ou atual, horário/período e local são obrigatórios no navegador e no servidor;
- itens com imagem (feature PRO): `imageUrl String?` e `imageStorageKey String?`; upload via `POST /api/services/[id]/image`, remoção via `DELETE`; imagem exibida no card público apenas quando `plan === "PRO"`; storage MinIO via `@aws-sdk/client-s3` em `lib/storage.ts`;
- exclusão de item com confirmação (`deleteService`);
- lista de itens colapsável — accordion idêntico ao padrão do painel de pedidos;
- **pagamento Pix obrigatório para itens FIXED**: `fixedServiceCheckoutMode` enum (`REQUEST_ONLY` | `REQUIRE_PIX_PAYMENT`); quando obrigatório, existe um único CTA "Pagar com Pix", o servidor impede bypass e redireciona para `/u/[slug]/reserva/[requestId]`; `fixedServiceAmount` é snapshot imutável e a confirmação é manual pelo negócio via `markPixReservationPaid`;
- **compatibilidade de pagamento legado**: `/u/[slug]/pagamento/[requestId]` permanece disponível para pedidos antigos, mas novos pedidos não são enviados para essa rota;
- vitrine pública `/u/[slug]`;
- pedido público exige ao menos e-mail ou telefone; `CUSTOM` e pedidos genéricos exigem descrição; `desiredDate`, `desiredTime` e `location` são condicionais ao item e exibidos no painel quando presentes;
- painel de pedidos;
- edição de nota do cliente diretamente no card do pedido (`updateQuoteRequestDescription`);
- criação de proposta;
- página pública `/proposta/[publicToken]`;
- aprovação/recusa;
- histórico de status de pedido e proposta;
- notas internas do pedido;
- templates de proposta;
- editor dinâmico de itens da proposta;
- planos e limites de uso;
- assinatura mensal PRO via Stripe Checkout;
- webhook Stripe em `/api/stripe/webhook` com validação de assinatura: trata `customer.subscription.created` e `customer.subscription.updated` (fall-through) para garantir que novas assinaturas ativem o plano PRO;
- upgrade e downgrade de plano via webhook (nunca via redirect ou front).
- carregamento de faturas em `/dashboard/billing` via `app/api/billing/invoices/route.ts` e `components/billing/AsyncInvoiceList.tsx`, sem bloquear a renderização da página;

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth v5 beta (Google OAuth + Credentials e-mail/senha, sessão `jwt`)
- Zod
- bcryptjs (hash de senha)
- Resend (e-mail de redefinição de senha)
- Stripe (assinatura mensal PRO via Checkout mode subscription, webhook assinado)

## Planos e limites

O plano fica em `ProviderProfile.plan` com enum `PlanTier`.

Limites centralizados em `lib/plan-limits.ts`:

- `FREE`: 3 itens ativos, 10 pedidos/mês, 5 propostas/mês, 1 template.
- `PRO`: limites `null`, sem limite prático no MVP.

Stripe é usado para assinatura do negócio (usuário da Vitriny). Para o cliente final, há Pix manual em proposta aprovada e pagamento antecipado obrigatório de item com preço fixo: o Vitriny mostra chave Pix, código copia e cola e QR Code, mas não processa dinheiro nem recebe confirmação automática. Stripe não é usado para pagamento do cliente final.

## Comandos principais

```bash
npm run dev
npm run lint
npm run build
npx prisma validate
npm run prisma:migrate
npm run prisma:generate
npm run prisma:studio

# Testes
npm test                   # unitários + actions, sem banco real
npm run test:integration   # integração com banco real, usa orcafacil_test
npm run test:e2e           # E2E Playwright (dev server deve estar rodando na porta 3000)
npm run test:e2e:ui        # Playwright com interface interativa
npm run playwright:install # instalar browsers do Playwright (primeira vez)
```

## Regras de trabalho

1. Planejar antes de alterar arquivos.
2. Listar arquivos que serão criados/alterados.
3. Implementar uma etapa pequena por vez.
4. Não alterar schema Prisma sem necessidade real.
5. Não alterar Auth.js sem necessidade real.
6. Rodar `npm run lint`, `npm run build` e `npx prisma validate`.
7. Atualizar documentação quando mudar fluxo, rota, schema ou setup.

## Como escolher a próxima tarefa

Priorize:

1. Teste manual completo do MVP.
2. Correção de bugs encontrados no fluxo.
3. Deploy/staging.
4. Melhorias pequenas validadas.

## Ordem recomendada

1. Validar fluxo em staging.
2. Criar páginas de detalhe de pedido/proposta se isso trouxer ganho operacional real.
3. Ampliar cobertura E2E de billing, Pix e personalização.
4. Revisar um eventual backfill de pedidos antigos para remover o fallback legado da descrição.

## Padrões de código existentes

- Server Components para páginas.
- Server Actions em `lib/actions/`.
- Zod em `lib/validations/`.
- Prisma direto no servidor.
- Componentes pequenos por domínio.
- Tailwind para UI.
- `lib/service-sale-mode.ts`: helper puro com `ServiceSaleMode`, `getServiceSaleMode` e `getTechnicalSaleMode`. Usar sempre que precisar converter entre o estado de UI (`saleMode`) e os campos técnicos `pricingType` / `fixedServiceCheckoutMode`.

## Restrições importantes

- Não usar Supabase.
- Não implementar gateway Pix, confirmação automática de pagamento, WhatsApp API, editor avançado de PDF ou IA sem validação.
- Não expor IDs internos em links públicos.
- Usar `publicToken` para proposta pública.
- Usar `slug` para perfil público.
- Cliente público não precisa de login.
- Item com `pricingType = FIXED` exige `basePrice` válido e maior que zero.
- Não remover enum `ServicePricingType` nem campo `pricingType` de `Service`.
- Compatibilidade: itens sem `pricingType` explícito são tratados como `CUSTOM`.
- `QuoteRequest.description` é nullable (`String?`) — pedidos FIXED podem não ter descrição do cliente.
- **`itemType` — restrições:**
  - `itemType` é classificação visual e organizacional; não usá-lo para decidir modo de venda, Pix ou proposta.
  - As regras de negócio continuam dependendo exclusivamente de `pricingType` e `fixedServiceCheckoutMode`.
  - Não criar models separados para `PRODUCT` e `SERVICE` no banco; não renomear o model `Service`.
- **`saleMode` — restrições:**
  - `ServiceSaleMode` (`CUSTOM` | `FIXED_REQUEST` | `FIXED_PIX`) existe apenas na UI/helper; nunca persistir no banco.
  - Usar `getServiceSaleMode` para derivar de campos do banco; usar `getTechnicalSaleMode` para converter de volta antes de salvar.
  - Centralizar em `lib/service-sale-mode.ts`; não duplicar a lógica de conversão em outros arquivos.
- Login é só Google OAuth + e-mail/senha. GitHub foi removido; não reintroduzir sem pedido explícito.
- Sessão é `jwt`, não `database` — necessário para o Credentials provider.
- Senha sempre hash bcrypt, nunca texto puro.
- Não vincular contas automaticamente entre Google e e-mail/senha com o mesmo e-mail.
- "Esqueci minha senha" nunca deve revelar se um e-mail existe no sistema.
- Pagamento Pix obrigatório — restrições de produto:
  - Não implementar gateway Pix nem confirmação automática.
  - Não usar Stripe para pagamento do cliente final.
  - Não criar webhook de pagamento.
  - Não exigir proposta para item FIXED.
  - Não quebrar fluxo de proposta para itens CUSTOM.
  - Não alterar Stripe de assinatura.
  - `markPixReservationPaid` é exclusivo do prestador autenticado — nunca expor ao cliente público.
  - Validar ownership de `QuoteRequest` pelo `ProviderProfile` do usuário logado.
  - `fixedServiceCheckoutMode = REQUEST_ONLY` para serviços CUSTOM — forçado na action.
  - `REQUIRE_PIX_PAYMENT` não oferece alternativa sem pagamento e é validado novamente no servidor.
  - Pedidos antigos ficam com campos Pix `null` — retrocompatibilidade obrigatória.
- Pagamento Pix direto legado — restrições de produto:
  - a rota `/u/[slug]/pagamento/[requestId]` atende apenas links antigos;
  - exige item `FIXED`, `fixedServiceAmount` e dados Pix válidos;
  - não exige `pixReservationRequestedAt` e não usa `markPixReservationPaid`;
  - nunca recalcular o valor a partir de `Service.basePrice`.
- Rate limiting — restrições:
  - o store in-memory em `proxy.ts` não é compartilhado entre processos; substituir por Redis/Upstash antes de escalar horizontalmente;
  - não reduzir os limites sem medir impacto em produção (formulário público: 20 req/min por IP).
- Upload de imagem — restrições:
  - detectar tipo por magic bytes (`detectImageMimeType`) antes de aceitar; não confiar em `Content-Type`;
  - nunca reutilizar `storageKey` de outro serviço — sempre derivar do `serviceId`.

## Arquivos para ler primeiro

1. `AGENTS.md`
2. `README.md`
3. `docs/PROJECT_OVERVIEW.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATABASE.md`
6. `prisma/schema.prisma`
7. `auth.ts`
8. `lib/actions/`
9. `lib/service-sale-mode.ts`

## Cuidados para não quebrar

- Ownership: sempre filtrar dados autenticados pelo `ProviderProfile` do usuário logado.
- Proposta pública: sempre buscar por `publicToken`.
- Perfil público: só mostrar `isPublished=true`.
- Itens públicos: só mostrar `isActive=true`.
- Pedido público: validar que `serviceId`, quando informado, pertence ao negócio e está ativo. Chamar `validateQuoteRequestForService` depois do Zod para regras dependentes do item (descrição obrigatória para CUSTOM, data futura, campos de agendamento).
- Status de pedido: registrar mudanças em `QuoteRequestStatusHistory`.
- Status de proposta: registrar mudanças em `ProposalStatusHistory`.
- Notas internas: nunca exibir em rotas públicas e sempre filtrar pelo negócio dono do pedido.
- Templates de proposta: sempre filtrar pelo negócio dono do modelo.
- Proposal response: bloquear se já aprovada/recusada ou expirada.
- Tipo de item: `pricingType = FIXED` exige `basePrice`; validar no Zod, não no banco.
- Formulário público: linguagem de "solicitação" vs "orçamento" é definida no servidor via SSR com base no `?serviceId=`; quando o item já vem do card público, o formulário usa essa seleção e oculta o select.
- Painel de pedidos: CTA "Criar proposta" é secundário para pedidos FIXED.
- `itemType`: usar apenas para exibição (badges, labels, textos de UI). Não condicionar lógica de negócio a `itemType`.
- `saleMode`: sempre derivar via `getServiceSaleMode`; sempre converter de volta via `getTechnicalSaleMode`; nunca persistir no banco.
- Dinheiro: manter `Decimal`, não usar `Float`.
- Reset de senha: token de uso único, expira em 1 hora, apagado (junto com qualquer outro do mesmo usuário) após uso.
- Pagamento Pix obrigatório — página `/u/[slug]/reserva/[requestId]`: verificar que o pedido existe, pertence ao `ProviderProfile` do slug, tem `service.pricingType === "FIXED"`, tem `pixReservationRequestedAt` preenchido e tem `fixedServiceAmount` preenchido. Retornar 404 em qualquer falha.
- Pagamento Pix direto legado — página `/u/[slug]/pagamento/[requestId]`: verificar pedido, slug, perfil publicado, item `FIXED`, `fixedServiceAmount` e dados Pix; retornar 404 em qualquer falha.
- `fixedServiceAmount`: nunca recalcular; usar sempre o snapshot do banco. A página de reserva não busca `service.basePrice`.
- `markPixReservationPaid`: validar ownership pelo perfil autenticado; checar `pixReservationRequestedAt !== null`; checar que `pixReservationPaidAt` ainda está `null` (idempotência).
- Webhook Stripe: `customer.subscription.created` e `customer.subscription.updated` usam o mesmo handler via fall-through — não separar sem motivo.

## Registro de front

- A relação `QuoteRequest.serviceId` existe no banco e já é consumida no front. Pedidos novos salvam a descrição limpa; o fallback legado existe apenas para pedidos antigos.
- `DateInput` usa `useDateInput` para máscara DD/MM/AAAA e converte para ISO (YYYY-MM-DD) antes do submit. As funções `isValidISODate` e `isISODateBeforeToday` em `lib/utils/date.ts` são compartilhadas entre validação client e server.
- `proxy.ts` aplica sliding-window rate limiting em POST antes de despachar para auth e server actions.
- `QuoteRequestStatusHistory`, `ProposalStatusHistory`, `QuoteRequestInternalNote`, `ProposalTemplate` e `ProposalTemplateItem` já têm UI nas áreas correspondentes.
- O formulário de proposta usa editor dinâmico para adicionar/remover itens sem limite fixo de linhas.
- `docs/FRONTEND_PENDING.md` registra o estado das melhorias concluídas e o backfill legado ainda opcional.
- `lib/service-sale-mode.ts` centraliza a conversão entre `pricingType`/`fixedServiceCheckoutMode` e o `saleMode` de UI. Testado em `tests/unit/service-sale-mode.test.ts`.

## Validação obrigatória após mudanças

```bash
npm run lint
npm run build
npx prisma validate
npm test
```

Se mudar banco:

```bash
npm run prisma:migrate -- --name nome-da-migration
npm run prisma:generate
# Replicar no banco de teste:
DATABASE_URL="postgresql://vitriny:vitriny@localhost:5432/orcafacil_test" npx prisma db push
```

Em produção, usar:

```bash
npx prisma migrate deploy
```

## Billing / Stripe

- `lib/stripe.ts` — singleton lazy do Stripe SDK (evita erro de build com chave ausente).
- `lib/actions/services.ts` — `createService`, `updateService`, `toggleServiceStatus`, `deleteService` (com `revalidatePath` + `redirect`).
- `lib/actions/quote-requests.ts` — `createQuoteRequest`, `updateQuoteRequestDescription` (inline edit de nota, retorna `ActionResult`).
- `lib/actions/billing.ts` — cria Checkout Session embutida e retorna `clientSecret`; também cancela/reativa assinatura, cria SetupIntent, troca forma de pagamento e abre o portal Stripe.
- `app/api/stripe/webhook/route.ts` — valida assinatura, processa eventos: `checkout.session.completed`, `customer.subscription.created` (fall-through para `updated`), `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- `app/(dashboard)/dashboard/billing/page.tsx` — página de billing.
- `components/billing/BillingCard.tsx` — card com plano, status, renovação, botão "Assinar PRO".
- `app/api/billing/invoices/route.ts` — consulta faturas do cliente Stripe autenticado sem travar a página.
- `components/billing/AsyncInvoiceList.tsx` — busca as faturas depois do primeiro paint e renderiza loading/erro.

Variáveis de ambiente obrigatórias:

- `STRIPE_SECRET_KEY` — chave secreta da Stripe (`sk_test_...` em dev, `sk_live_...` em prod).
- `STRIPE_WEBHOOK_SECRET` — segredo do endpoint do webhook (`whsec_...`).
- `STRIPE_PRO_PRICE_ID` — ID do preço mensal PRO (`price_...`). Diferente entre test e live.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — chave pública usada pelo Stripe Elements no navegador.
- `NEXT_PUBLIC_APP_URL` — URL base para `return_url` do Checkout e retorno do portal.

Regras críticas:

- `plan` só vai para PRO via webhook (nunca via redirect de success_url ou front).
- `stripeCustomerId` é criado uma única vez e reutilizado em checkouts futuros.
- Webhook valida assinatura com `STRIPE_WEBHOOK_SECRET` em toda requisição.
- Para testar localmente: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- Em produção: configurar endpoint no Stripe Dashboard → Developers → Webhooks.

Lógica de plan por status Stripe:

- `active`, `trialing` → PRO
- `canceled`, `unpaid`, `incomplete_expired`, `paused` → FREE (downgrade)
- `past_due`, `incomplete` → plan mantido (Stripe ainda tentará cobrar)

## Documentação

Atualizar documentação quando mudar:

- rotas;
- schema;
- Auth;
- variáveis de ambiente;
- comandos;
- fluxo do MVP;
- decisões de produto.
