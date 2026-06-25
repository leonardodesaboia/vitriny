# AI Handoff

## Resumo rápido

OrçaFácil é um MVP de microSaaS para prestadores receberem pedidos de orçamento e enviarem propostas por link.

O MVP principal está implementado.

## Estado atual

Funciona hoje:

- login com Google OAuth e e-mail/senha (cadastro, login, recuperação de senha);
- dashboard protegido;
- perfil do prestador;
- serviços;
- página pública `/u/[slug]`;
- pedido público;
- painel de pedidos;
- criação de proposta;
- página pública `/proposta/[publicToken]`;
- aprovação/recusa;
- histórico de status de pedido e proposta;
- notas internas do pedido;
- templates de proposta;
- editor dinâmico de itens da proposta;
- planos e limites de uso sem checkout real;
- assinatura mensal PRO via Stripe Checkout;
- webhook Stripe em `/api/stripe/webhook` com validação de assinatura;
- upgrade e downgrade de plano via webhook (nunca via redirect ou front).

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

- `FREE`: 3 serviços ativos, 10 pedidos/mês, 5 propostas/mês, 1 template.
- `PRO`: limites `null`, sem limite prático no MVP.

Não há checkout, Pix, gateway ou cobrança real. A migration `add_provider_plan` ainda não foi criada nesta etapa.

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
npm test                   # unitários + actions (179 testes, sem banco real)
npm run test:integration   # integração com banco real (24 testes, usa orcafacil_test)
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
3. Adicionar notificações por e-mail.
4. Revisar um eventual backfill de pedidos antigos para remover o fallback legado da descrição.

## Padrões de código existentes

- Server Components para páginas.
- Server Actions em `lib/actions/`.
- Zod em `lib/validations/`.
- Prisma direto no servidor.
- Componentes pequenos por domínio.
- Tailwind para UI.

## Restrições importantes

- Não usar Supabase.
- Não implementar Pix, pagamento, WhatsApp API, PDF avançado ou IA sem validação.
- Não expor IDs internos em links públicos.
- Usar `publicToken` para proposta pública.
- Usar `slug` para perfil público.
- Cliente público não precisa de login.
- Serviço com `pricingType = FIXED` exige `basePrice` válido e maior que zero.
- Não remover enum `ServicePricingType` nem campo `pricingType` de `Service`.
- Compatibilidade: serviços sem `pricingType` são tratados como `CUSTOM`.
- Login é só Google OAuth + e-mail/senha. GitHub foi removido; não reintroduzir sem pedido explícito.
- Sessão é `jwt`, não `database` — necessário para o Credentials provider.
- Senha sempre hash bcrypt, nunca texto puro.
- Não vincular contas automaticamente entre Google e e-mail/senha com o mesmo e-mail.
- "Esqueci minha senha" nunca deve revelar se um e-mail existe no sistema.

## Arquivos para ler primeiro

1. `AGENTS.md`
2. `README.md`
3. `docs/PROJECT_OVERVIEW.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATABASE.md`
6. `prisma/schema.prisma`
7. `auth.ts`
8. `lib/actions/`

## Cuidados para não quebrar

- Ownership: sempre filtrar dados autenticados pelo `ProviderProfile` do usuário logado.
- Proposta pública: sempre buscar por `publicToken`.
- Perfil público: só mostrar `isPublished=true`.
- Serviços públicos: só mostrar `isActive=true`.
- Pedido público: validar que `serviceId`, quando informado, pertence ao prestador e está ativo.
- Status de pedido: registrar mudanças em `QuoteRequestStatusHistory`.
- Status de proposta: registrar mudanças em `ProposalStatusHistory`.
- Notas internas: nunca exibir em rotas públicas e sempre filtrar pelo prestador dono do pedido.
- Templates de proposta: sempre filtrar pelo prestador dono do modelo.
- Proposal response: bloquear se já aprovada/recusada ou expirada.
- Tipo de serviço: `pricingType = FIXED` exige `basePrice`; validar no Zod, não no banco.
- Formulário público: linguagem de 'solicitação' vs 'orçamento' é definida no servidor via SSR com base no `?serviceId=`.
- Painel de pedidos: CTA 'Criar proposta' é secundário para pedidos FIXED.
- Dinheiro: manter `Decimal`, não usar `Float`.
- Reset de senha: token de uso único, expira em 1 hora, apagado (junto com qualquer outro do mesmo usuário) após uso.

## Pendências de front documentadas

- A relação `QuoteRequest.serviceId` existe no banco e já é consumida no front. Pedidos novos salvam a descrição limpa; o fallback legado existe apenas para pedidos antigos.
- `QuoteRequestStatusHistory`, `ProposalStatusHistory`, `QuoteRequestInternalNote`, `ProposalTemplate` e `ProposalTemplateItem` já têm UI nas áreas correspondentes.
- O formulário de proposta usa editor dinâmico para adicionar/remover itens sem limite fixo de linhas.
- Detalhes de implementação futura ficam em `docs/FRONTEND_PENDING.md`.

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
DATABASE_URL="postgresql://orcafacil:orcafacil@localhost:5432/orcafacil_test" npx prisma db push
```

Em produção, usar:

```bash
npx prisma migrate deploy
```

## Billing / Stripe

- `lib/stripe.ts` — singleton lazy do Stripe SDK (evita erro de build com chave ausente).
- `lib/actions/billing.ts` — `createCheckoutSession`: cria/reutiliza stripeCustomerId, cria Checkout Session mode subscription, redireciona para Stripe.
- `app/api/stripe/webhook/route.ts` — valida assinatura, processa eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- `app/(dashboard)/dashboard/billing/page.tsx` — página de billing.
- `components/billing/BillingCard.tsx` — card com plano, status, renovação, botão "Assinar PRO".

Variáveis de ambiente obrigatórias:
- `STRIPE_SECRET_KEY` — chave secreta da Stripe (`sk_test_...` em dev, `sk_live_...` em prod).
- `STRIPE_WEBHOOK_SECRET` — segredo do endpoint do webhook (`whsec_...`).
- `STRIPE_PRO_PRICE_ID` — ID do preço mensal PRO (`price_...`). Diferente entre test e live.
- `NEXT_PUBLIC_APP_URL` — URL base para success_url e cancel_url do Checkout.

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
