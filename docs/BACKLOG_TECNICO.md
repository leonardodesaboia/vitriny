# Backlog Técnico Detalhado

Guia de implementação para as próximas evoluções da aplicação. Complementa o `ROADMAP.md` (alto nível) com o **como fazer** de cada item: motivação, abordagem técnica, arquivos envolvidos, riscos e esforço estimado.

Última atualização: 9 de julho de 2026.

Ordem de prioridade sugerida: seção 1 → 2 → 3; as demais conforme demanda.

> **Entregue em 09/07/2026:** seções **1** (funcionalidades novas) e **2**
> (mudanças de lógica) completas na branch `refactor/services-to-items` —
> specs em `docs/superpowers/specs/2026-07-09-*`. Próximo: seção 3, ou o 8.3
> (CTA de upgrade) como vitória rápida.

---

## 1. Funcionalidades novas

### 1.1 Botão "Já paguei" na reserva Pix ⭐ (recomendado como próximo passo)

**Problema:** o ciclo do Pix obrigatório depende de o cliente avisar por fora (WhatsApp). Se ele paga e não avisa, o negócio não tem sinal nenhum no painel.

**Como fazer:**

1. **Schema**: `QuoteRequest.pixReservationClientPaidAt DateTime?` + migração (sem backfill — estado novo).
2. **Server Action** (`lib/actions/quote-requests.ts`): `markPixReservationClientPaid(requestId, slug)` — **pública** (o cliente não tem login), então validar: pedido pertence ao perfil do slug, `pixReservationRequestedAt` preenchido, não expirado, `pixReservationPaidAt` ainda nulo. Idempotente (segundo clique não erra). Aplicar rate limit em `proxy.ts` para o path da reserva.
3. **UI da reserva** (`app/u/[slug]/reserva/[requestId]/page.tsx`): no estado pendente, botão "Já fiz o pagamento" abaixo do QR. Após marcar, trocar o bloco "Próximos passos" por "Pagamento informado — aguardando confirmação do negócio". Manter o botão de WhatsApp.
4. **Painel** (`QuoteRequestCard`): novo estado do badge — `clientPaidAt && !paidAt` → **"Cliente informou pagamento"** (âmbar forte), com destaque na visão `PIX_RESERVATION` (ordenar esses primeiro).
5. **E-mail opcional** ao negócio via `after()`: "Fulano informou o pagamento de R$ X".
6. **Dashboard**: a pendência "Pagamentos Pix para confirmar" pode ganhar sub-contagem "N informados pelo cliente".
7. **Testes**: action (ownership por slug, idempotência, expirado rejeita), unit do badge.

**Risco:** cliente pode marcar sem pagar — é apenas um *sinal*, a confirmação continua manual. Deixar isso claro nos textos.
**Esforço:** ~meio dia.

### 1.2 Página de detalhe do pedido (`/dashboard/pedidos/[id]`)

**Problema:** tudo vive em cards expansíveis numa lista única; e-mails de "novo pedido" apontam para a lista genérica; paginação futura briga com o modelo atual.

**Como fazer:**

1. Nova rota `app/(dashboard)/dashboard/pedidos/[id]/page.tsx`: busca com ownership (`findFirst({ id, providerId })`, senão `notFound`), reutilizando as seções já existentes no `QuoteRequestCard` expandido (extrair os blocos — contato, agendamento, descrição, proposta, Pix, notas, histórico — para componentes compartilháveis em `components/quote-request/sections/`).
2. O card da lista vira um resumo clicável que navega para o detalhe (remover o accordion gradualmente, ou manter ambos numa primeira fase).
3. Atualizar `dashboardUrl` nos e-mails (`lib/email.ts` / `createQuoteRequest`) para `/dashboard/pedidos/{id}`.
4. Breadcrumb "← Pedidos" e as mesmas actions (status, notas, confirmar Pix) na página.

**Esforço:** 1–2 dias (a extração dos blocos é a parte trabalhosa).
**Dependência:** fazer antes da paginação (3.4).

### 1.3 Compartilhar item no WhatsApp

**Problema:** o dono compartilha a vitrine inteira; falta o link de venda por item — como esse público realmente vende.

**Como fazer:**

1. No `ServiceItem` (painel), botão "Compartilhar" ao lado do preço: abre `wa.me/?text=` (sem número — o dono escolhe o contato) com mensagem de `lib/whatsapp-messages.ts`:
   `itemShareMessage(name, price?, url)` → "Olá! Veja {nome} na minha vitrine: {NEXT_PUBLIC_APP_URL}/u/{slug}/orcamento?serviceId={id}".
2. Alternativa no mesmo botão: "Copiar link" (reusar `CopyButton`).
3. O slug precisa chegar ao `ServiceItem` (passar da página, como foi feito com `allowItemTypeSelection`).

**Esforço:** ~2 horas.

### 1.4 Resumo financeiro do mês na dashboard

**Problema:** a dashboard conta pedidos/propostas mas não mostra o número que retém o usuário: **quanto ele movimentou**.

**Como fazer:**

1. Em `app/(dashboard)/dashboard/page.tsx`, adicionar à `$transaction` dois `aggregate`:
   - `proposal.aggregate({ _sum: { totalAmount }, where: { providerId, status: "APPROVED", respondedAt: { gte, lt } } })`
   - `quoteRequest.aggregate({ _sum: { fixedServiceAmount }, where: { providerId, pixReservationPaidAt: { gte, lt } } })`
2. Card de destaque "Movimentado no mês: R$ X" (soma dos dois) no topo do `DashboardMetricGrid`, com breakdown no hover/descrição.
3. Decimal → string na fronteira server/client, como nos demais.
4. Futuro: esse número é o argumento de venda do PRO ("você movimentou R$ X este mês").

**Esforço:** ~2 horas.

### 1.5 Contagem de visitas da vitrine na dashboard ✅ (entregue 22/07/2026)

**Problema:** sem observabilidade sobre o tráfego, o dono não sente o valor da vitrine pública — não sabe se a página está sendo vista.

**Como fez:**

1. **Beacon client** em `/u/[slug]`: request silencioso a `POST /api/storefront-view` ao carregar. Dedupado por sessão em `sessionStorage`.
2. **Model `StorefrontView`**: `(providerId, date)` PK composta, campo `count` (Int). Schema em `prisma/schema.prisma`.
3. **Endpoint `POST /api/storefront-view`**: recebe beacon, filtra dono logado e bots, faz `upsert` com `count: { increment: 1 }`.
4. **Dashboard** (`app/(dashboard)/dashboard/page.tsx`): card "Visitas à vitrine" exibindo últimos 7 dias (primário) e 30 dias (subtext), agregação `_sum` no banco. FREE em todos os planos.

**Fase 2 (PRO, ✅ entregue 22/07/2026):** detalhe por item via `ItemView` model (`(serviceId, date)` PK), ranking top 5 dos itens mais vistos nos últimos 30 dias na dashboard. Gating via `canUseStorefrontAnalytics` (PRO); FREE vê card de upsell. Beacon estendido com `serviceId` em `/u/[slug]/orcamento?serviceId=X`; endpoint upsert aplica-se a ambos `StorefrontView` e `ItemView`.

**Fase 3 (PRO, próxima):** origem do tráfego via links marcados com `?ref=` (não via referrer — unreliable em navegadores in-app de Instagram/WhatsApp). Requer schema adicional e beacon expandido.

**Esforço real (fases 1+2 juntas):** ~1.5 dias (beacon, models, endpoint, cards de dashboard).

---

## 2. Mudanças de lógica

### 2.1 Refactor de planos (fazer ANTES de criar qualquer plano novo) ⭐

**Problema:** 17 checagens `plan === "PRO"` espalhadas (upload de imagem, vitrine, orçamento, temas, formulários, billing) e o webhook Stripe resolve o plano só pelo *status* da assinatura, ignorando `stripePriceId`. Um terceiro plano quebraria imagens/temas silenciosamente para quem pagar mais, e o webhook não saberia qual plano foi comprado.

**Como fazer:**

1. Em `lib/plan-limits.ts`, criar o mapa de capacidades:
   ```ts
   export const PLAN_FEATURES: Record<PlanTier, { serviceImages: boolean; themePresets: boolean }> = {
     FREE: { serviceImages: false, themePresets: false },
     PRO:  { serviceImages: true,  themePresets: true },
   };
   export const canUseServiceImages = (plan: PlanTier) => PLAN_FEATURES[plan].serviceImages;
   export const canUseThemePresets = (plan: PlanTier) => PLAN_FEATURES[plan].themePresets;
   ```
2. Substituir cada `plan === "PRO"` pelo helper correspondente (grep por `=== "PRO"` e `!== "PRO"`). Casos de UI de billing (`plan === "FREE"` para mostrar upgrade) podem virar `plan !== ...` explícito ou helper `isPaidPlan`.
3. **Webhook por preço**: mapa `STRIPE_PRICE_TO_PLAN: Record<string, PlanTier>` (a partir de envs `STRIPE_PRO_PRICE_ID`, futuros `STRIPE_X_PRICE_ID`). Em `customer.subscription.created/updated`, resolver `plan` por `firstItem.price.id` quando status ativo/trialing; manter o downgrade por status.
4. **Preço na landing**: extrair "R$ 19,90" para constante única (ex.: `lib/plan-limits.ts` → `PLAN_PRICES`) usada em `LandingPricing` — evita divergência com o Stripe.
5. Testes: unit para os helpers; atualizar o teste do webhook.

**Esforço:** ~1 dia. Nenhuma mudança de comportamento visível — é blindagem.

### 2.2 Snapshot como fonte primária do nome no histórico

**Problema:** o pedido exibe o nome *atual* do item (relação) e só usa o snapshot após exclusão; renomear o item reescreve o passado.

**Como fazer:** inverter a ordem do fallback para `serviceNameSnapshot ?? service?.name ?? ...` nos quatro pontos: `QuoteRequestCard`, página de reserva, página pública da proposta, rota de PDF (+ `propostas/nova`). Pedidos anteriores ao backfill sem snapshot continuam caindo na relação.
**Esforço:** minutos. Decidir antes: essa é a semântica desejada? (Recomendado: sim — histórico conta a verdade da época.)

### 2.3 Hash no token de reset de senha

**Problema:** `PasswordResetToken.token` fica em texto puro; o token de verificação de e-mail já usa SHA-256. Vazamento de banco = takeover via reset.

**Como fazer (sem quebrar links já enviados — TTL é 1h, então dá até para ignorar transição):**

1. Renomear coluna para `tokenHash` (migração) e reaproveitar `hashEmailVerificationToken` (mover para `lib/auth/tokens.ts` genérico).
2. `requestPasswordReset`: gravar o hash, enviar o token puro no link (como já é feito na verificação).
3. `resetPassword` e página `redefinir-senha/[token]`: buscar por `hashToken(token)`.
4. Migração simples: `deleteMany` de tokens pendentes na virada (quem pediu reset pede de novo) — mais simples que dupla-coluna.
5. Testes espelhando os da verificação de e-mail.

**Esforço:** ~2 horas.

### 2.4 Paginação do painel de pedidos

**Problema:** a página carrega TODOS os pedidos com histórico/notas/proposta de cada um e filtra em JS — degrada com o sucesso do usuário.

**Como fazer:**

1. Fazer **depois** da página de detalhe (1.2): a lista passa a carregar só o resumo (sem `statusHistory`/`internalNotes` — que vivem no detalhe).
2. Cursor-based: `?cursor={id}` com `take: 20`, botão "Carregar mais" (ou paginação por página, mais simples: `?page=`).
3. Contadores dos filtros via `groupBy({ by: ["status"], _count: true, where: { providerId } })` — uma query em vez de filtrar array.
4. Filtros de status/view viram condições no `where` (a lógica pura de `matchesDashboardRequestView` ganha um espelho em Prisma where; manter a função pura para as views que precisam de JS).

**Esforço:** ~1 dia junto com 1.2.

### 2.5 Reabrir/estender reserva Pix expirada

**Problema:** reserva expira em 48h; o negócio não tem ação — o cliente precisa refazer o pedido (gastando o limite mensal de novo).

**Como fazer:** action provider-only `reopenPixReservation(requestId)` que faz `pixReservationRequestedAt = now()` (novo prazo de 48h) se `paidAt` nulo. Botão "Gerar novo prazo" no card quando o badge é "Pix expirado". E-mail opcional ao cliente com o link da reserva (via `after()`).
**Esforço:** ~2 horas.

---

## 3. Infra e segurança

### 3.1 Idempotência e ordem no webhook Stripe

- Guardar `event.id` processados (tabela `StripeWebhookEvent(id, createdAt)` com unique) e ignorar repetidos.
- Para fora-de-ordem: comparar `event.created` com um `stripeEventTimestamp` no perfil e descartar eventos mais antigos que o último aplicado (por tipo de recurso).
- Prioridade sobe quando houver mais de um plano (junto de 2.1).

### 3.2 Rate limiting distribuído

- O store in-memory de `proxy.ts` não sobrevive a restart nem escala horizontal. Trocar por Upstash Redis (`@upstash/ratelimit`, sliding window) mantendo as mesmas regras/paths. Só necessário quando houver mais de uma instância.
- Bônus: página 429 amigável em vez do texto puro (interceptar no cliente ou `Retry-After` + página estática).

### 3.3 Corridas nos limites de plano

- Todos os limites usam count→create na mesma transação sem lock; concorrência pode furar o limite FREE.
- Correção pragmática: `SELECT ... FOR UPDATE` no perfil dentro da transação (`tx.$queryRaw`) serializa por prestador. Alternativa: aceitar o risco (baixo impacto) e documentar.

### 3.4 Validação de ambiente na inicialização

- `lib/storage.ts` e envs críticas (`NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `STRIPE_*`, `RESEND_*`) sem validação — erros só em runtime, com mensagens crípticas.
- Criar `lib/env.ts` com schema Zod das envs, importado em `next.config.mjs`/instrumentation — falha no boot com mensagem clara.

### 3.5 Higienes com cron (Vercel Cron ou similar)

- **Contas não verificadas**: apagar `User` com `emailVerified null && password != null && createdAt < 30 dias` (libera e-mails "squatted" por typo/abuso).
- **Tokens expirados**: `deleteMany` de reset/verificação vencidos.
- **Imagens órfãs no bucket**: listar `services/` no S3 e apagar objetos sem `imageStorageKey` correspondente (itens excluídos antes da correção de limpeza já deixaram órfãos).

### 3.6 Segurança menor

- Rate limit em `POST /redefinir-senha/:path*` (bcrypt gratuito para abuso).
- Timing uniforme em `requestPasswordReset`/`resendEmailVerification` (enfileirar envio via `after()` também iguala o tempo de resposta — resolve dois problemas).
- CSP: mapear origens do Stripe Elements e ativar (comentário em `next.config.mjs` já reserva o lugar).

---

## 4. UX pendentes (menores)

- **Funil "Começar com PRO"**: `/cadastro?plan=pro` → persistir intenção (cookie ou query atravessando a verificação de e-mail) → após primeiro login, redirecionar a `/dashboard/billing` com checkout aberto.
- **OG image**: `app/opengraph-image.tsx` (ImageResponse) com a marca — o card do WhatsApp hoje sai sem imagem.
- **`LandingPainStrip`**: decidir — plugar na landing (seção de dores converte) ou deletar as 194 linhas órfãs.
- **Hero visível sem JS**: trocar `initial={{ opacity: 0 }}` do H1/CTA por animação só de `y`/CSS para não esconder o LCP até a hidratação.
- **Mobile do dashboard**: auditar autenticado (não coberto na auditoria pública): sobreposição do hambúrguer fixo com o título nas páginas, e a altura fixa `h-32` do card de pedido com muitos badges.
- **Validação client-side "e-mail ou telefone"** no formulário público (hoje só o servidor valida — roundtrip para descobrir).
- **CTA de WhatsApp na proposta aprovada** (enviar comprovante da entrada) — a reserva tem, a proposta não.
- **Status da reserva sem F5**: botão "Atualizar status" ou polling leve na página de reserva.
- **`setCustomValidity` em `DateInput`/`CurrencyInput`**: `required` desses campos não funciona no browser (hidden input) — erro só chega do servidor.

---

## 5. Tela administrativa (fundações prontas)

O soft delete já preparou o terreno: `User.deletedAt`, `deletedEmailHash` (indexado), histórico preservado e anonimizado.

**Escopo mínimo sugerido quando chegar a hora:**

1. **Gate**: role no `User` (`role: ADMIN | PROVIDER`, default PROVIDER) + guard `requireAdmin` + rota `/admin` fora do layout do dashboard.
2. **Visões**: lista de contas (ativas/excluídas — `deletedAt IS NOT NULL`), métricas globais (contas, pedidos/mês, propostas aprovadas, MRR via Stripe), detalhe de conta com histórico.
3. **Detecção de recorrência**: no cadastro, comparar `sha256(email)` com `deletedEmailHash` e sinalizar no admin ("conta recriada após exclusão") — sem bloquear, só informar.
4. **Nunca** expor dados anonimizados como se fossem atuais; rotular "Conta excluída em {data}".

---

## 6. Qualidade e operação

- **E2E dos fluxos de dinheiro**: hoje o Playwright cobre landing/auth/perfil público/verificação de e-mail. Faltam os dois fluxos críticos: pedido→reserva Pix→confirmação do negócio, e proposta→aprovação→entrada. São os testes que evitam regressão onde dói.
- **Observabilidade**: os `console.error` estruturados já existem; plugar Sentry (ou similar) para server actions e route handlers antes de usuários reais. Alertar falhas de webhook Stripe e de envio Resend.
- **Backup do PostgreSQL**: rotina de dump + retenção antes do primeiro usuário pagante.
- **Export CSV de pedidos** (para o dono): botão no painel exportando os campos principais — barato e pedido comum desse público.
- **Multi-usuário por negócio (futuro distante)**: `QuoteRequestInternalNote.authorUserId` já existe; o que falta é `ProviderProfile` 1↔N `User` com papéis — só considerar com demanda real. Registrado aqui para ninguém quebrar a premissa "1 usuário = 1 negócio" sem querer.

---

## 7. SEO

Estado atual (já implementado): metadata raiz com template/OG/Twitter e `metadataBase`; `robots.ts` e `sitemap.xml` dinâmico (landing + vitrines publicadas); `generateMetadata` com canonical em `/u/[slug]`; favicon; `noindex` nas páginas de pagamento.

A tese de SEO do produto: **cada vitrine publicada é uma página indexável no domínio** — o tráfego orgânico vem dos clientes buscando o nome dos negócios, não de termos genéricos. As melhorias abaixo seguem essa tese, em ordem de valor:

### 7.1 JSON-LD `LocalBusiness` nas vitrines ⭐

Em `app/u/[slug]/page.tsx`, montar structured data com os dados que a página já busca:

```
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": businessName,
  "description": description,
  "telephone": phone,
  "address": { "@type": "PostalAddress", "addressLocality": city, "addressRegion": state, "addressCountry": "BR" },
  "url": `${appUrl}/u/${slug}`,
  "makesOffer": services.map(s => ({ "@type": "Offer", "itemOffered": { "@type": s.itemType === "PRODUCT" ? "Product" : "Service", "name": s.name }, ...(preço fixo && { price, priceCurrency: "BRL" }) }))
}
```

Renderizar num `<script type="application/ld+json">`. **Importante (XSS)**: como os dados vêm do banco (nomes/descrições digitados pelo negócio), serializar com escape de `<` para impedir quebra da tag: `JSON.stringify(data).replace(/</g, "\\u003c")` antes de injetar. Validar no Rich Results Test do Google. Esforço: ~2h.

### 7.2 OG images

- **Estática (landing)**: `app/opengraph-image.tsx` com `ImageResponse` — logo + tagline no estilo da marca (fundo `#1B5E3B`, Fraunces).
- **Dinâmica por vitrine**: `app/u/[slug]/opengraph-image.tsx` — nome do negócio + cidade; é o que faz o link compartilhado no WhatsApp parecer profissional. Cache padrão do Next resolve o custo de geração.

### 7.3 `noindex` em páginas transacionais

- `/u/[slug]/orcamento`: conteúdo raso/duplicado da vitrine — exportar `metadata = { robots: { index: false } }` (e um `title` próprio "Pedido — {negócio}" para a aba).
- `/proposta/[publicToken]`: robots.txt bloqueia crawl mas não indexação de URL linkada; adicionar meta `noindex` como reforço.

### 7.4 Core Web Vitals das páginas públicas

- Trocar `<img>` cru por `next/image` nas imagens de itens (vitrine e orçamento): configurar `images.remotePatterns` no `next.config.mjs` para o host S3/MinIO (`S3_PUBLIC_BASE_URL`). Melhora LCP.
- Hero da landing: remover `opacity: 0` inicial do H1/CTA (animar só `y`, ou CSS) — o texto principal não deve depender de hidratação para aparecer.

### 7.5 Menores

- `lastModified` na entrada da landing no sitemap.
- JSON-LD `Organization` + `WebSite` na landing.
- Página 404 customizada (`app/not-found.tsx`) com link para a home — hoje é a padrão do Next.
- Estratégico (não é código): não investir em conteúdo/blog até o efeito de rede das vitrines dar sinal; a página única da landing é suficiente para o termo de marca.

---

## 8. Planos e monetização

Recomendações sobre a estrutura FREE/PRO. Os itens 8.1 e 8.2 são **decisões de negócio** (os números finais são do dono do produto); o código de cada uma é pequeno. O 8.3 é implementável direto.

### 8.1 Repensar o limite de pedidos do FREE ⭐ (decisão de negócio)

**Problema:** é o único limite sentido pelo **cliente final** do negócio, não pelo dono. Quando estoura, quem vê "Este negócio atingiu o limite mensal de pedidos" é o cliente tentando comprar — queima o negócio na frente do cliente dele e a marca junto, no momento exato em que o produto prova valor. Pedido chegando é o motor de retenção do dono; cortá-lo no FREE trava a adoção.

**Recomendação:** remover o limite de pedidos ou subi-lo para um teto anti-abuso que negócio legítimo nunca atinge (ex.: 50/mês). Manter a pressão de upgrade nos limites que o **dono** sente: itens, propostas, fotos, temas.

**Implementação:** trocar `PLAN_LIMITS.FREE.monthlyQuoteRequests` em `lib/plan-limits.ts` (para `null` ou o novo teto) e atualizar a lista do plano Grátis na landing. Sem migração; o caminho de erro continua existindo para o teto anti-abuso.

### 8.2 Fotos nos itens do FREE (decisão de negócio)

**Problema:** com `businessType: PRODUCTS`, uma vitrine de produtos **sem nenhuma foto** não é versão limitada — é vitrine que não vende. Ciclo perverso: FREE sem fotos → vitrine feia → não converte → o dono conclui que "o Vitriny não funciona" → churn antes de considerar o PRO.

**Recomendação:** permitir foto nos itens do FREE (o limite de 3 itens ativos já limita a 3 fotos naturalmente). PRO passa a ser "itens e fotos ilimitados + temas visuais" — o upgrade nasce de querer *mais*, não de estar aleijado. Temas continuam sendo gatilho PRO perfeito (estética, não funcionalidade básica).

**Implementação** (fazer junto do refactor 2.1, virando capability): remover o gate de plano em quatro pontos — `app/api/services/[id]/image/route.ts` (403 para não-PRO no POST e DELETE), `app/u/[slug]/page.tsx` e `app/u/[slug]/orcamento/page.tsx` (render condicionado a PRO) e o gating de UI no `ServiceForm` (`isPro`). Atualizar as listas de recursos na landing (`LandingPricing`) e no `BillingCard`.

### 8.3 CTA de upgrade nas mensagens de limite

**Problema:** a mensagem de limite ("Limite de itens ativos atingido...") é o momento de maior intenção de compra do produto — a pessoa quer fazer algo e o plano impede — e hoje não tem nem link para o billing.

**Implementação:**

1. Componente `LimitErrorNotice` (ou apenas concatenar nas páginas): mensagem + `<Link href="/dashboard/billing">Conhecer o plano PRO →</Link>`.
2. Aplicar onde `LIMIT_ERROR_MESSAGES`/códigos `limit-*` são renderizados: página de itens, criação de proposta, templates.
3. **Nunca** no lado público: `PUBLIC_LIMIT_ERROR_MESSAGES` (visto pelo cliente final) continua sem CTA de upgrade — cliente final não é quem assina.

**Esforço:** ~1h. Provavelmente o maior efeito imediato em conversão pelo menor custo.

### 8.4 Depois dos primeiros assinantes

- **Plano anual com desconto** (ex.: R$ 199/ano ≈ 2 meses grátis): segundo `price` no Stripe, seleção no checkout e webhook resolvendo por `priceId` — **depende do refactor 2.1**. Reduz churn e antecipa caixa.
- **Trial do PRO com cartão** no onboarding: `subscription_data.trial_period_days` no Checkout; medir conversão antes de decidir duração.

### 8.5 O que não mudar (por ora)

- **R$ 19,90/mês**: bem calibrado para MEI; não mexer antes de dados reais de conversão.
- **Dois planos**: é o número certo para o MVP; nenhum terceiro tier antes do refactor 2.1.
- **5 propostas/mês e 1 template no FREE**: gatilhos legítimos — o dono sente, o cliente final não.

---

## Riscos de deploy (checklist permanente)

- `prisma migrate deploy` no pipeline (três migrações recentes: verificação de e-mail, snapshot, soft delete/split de agendamento).
- `EMAIL_FROM` com domínio verificado no Resend — com verificação de e-mail obrigatória, sandbox = **nenhum cadastro consegue ativar**.
- `STRIPE_WEBHOOK_SECRET` configurado no endpoint de produção.
- Revisar `/termos` e `/privacidade` (texto redigido a partir do comportamento real do código, mas merece revisão jurídica).
- Reiniciar o processo após deploy com mudança de schema (Prisma Client em memória).
