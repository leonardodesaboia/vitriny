# Database

## Visão geral

O banco usa PostgreSQL com Prisma. O schema fica em `prisma/schema.prisma`.

A linguagem da interface não altera o schema: `Service` é exibido como item da vitrine, `ProviderProfile` como vitrine pública e `QuoteRequest` como pedido ou solicitação. Os nomes abaixo permanecem técnicos e canônicos no código.

## Models

### User

Usuário autenticado pelo Auth.js (Google OAuth ou e-mail/senha).

Campos importantes:

- `password`: hash bcrypt, `null` para contas que só usam Google.

Relaciona-se com:

- `ProviderProfile`
- `Account`
- `Session`
- `PasswordResetToken`

### Account

Conta OAuth usada pelo Auth.js/Prisma Adapter.

### Session

Modelo padrão do adapter. O fluxo atual usa sessão JWT e não depende de registros persistidos em `Session`.

### VerificationToken

Modelo padrão do Auth.js, sem uso real no fluxo atual (não é reaproveitado para reset de senha).

### PasswordResetToken

Token de uso único para redefinição de senha por e-mail/senha.

Campos importantes:

- `userId`: usuário relacionado.
- `token`: único, gerado com `crypto.randomBytes(32).toString("hex")`.
- `expiresAt`: expira em 1 hora a partir da criação.

Apagado (junto com qualquer outro token do mesmo usuário) ao ser usado com sucesso em `resetPassword`. Relação com `User` tem `onDelete: Cascade`.

### ProviderProfile

Perfil do prestador.

Campos importantes:

- `slug`: URL pública em `/u/[slug]`.
- `plan`: plano comercial (`FREE` ou `PRO`) usado para limites de uso.
- `themePreset`: preset visual salvo para dashboard do profissional e fluxo público do cliente. O valor default é `DEFAULT`.
- `isPublished`: controla se o perfil aparece publicamente.
- `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `subscriptionStatus`, `currentPeriodEnd`, `cancelAtPeriodEnd`: estado local da assinatura Stripe.
- `pixKey`, `pixKeyType`, `pixHolderName`, `pixCity`: dados Pix do prestador para entrada de proposta e pagamento antecipado de serviço fixo.

Relaciona-se com:

- `User`
- `Service`
- `QuoteRequest`
- `Proposal`
- `ProposalTemplate`

O default de `plan` é `FREE`. A assinatura Stripe atualiza o plano e os campos de assinatura por webhook; migrations de plano e billing já estão versionadas.

### Service

Item da vitrine. Pode ser classificado visualmente como Produto ou Serviço via `itemType`. Na interface, `Service` é apresentado como "item da vitrine"; o nome do model não muda.

Campos importantes:

- `itemType`: natureza do item (`SERVICE` ou `PRODUCT`). Default `SERVICE`. Não altera regras de preço, proposta ou Pix.
- `basePrice`: `Decimal? @db.Decimal(10, 2)`.
- `isActive`: controla se aparece publicamente.
- `pricingType`: tipo de precificação (`FIXED` ou `CUSTOM`). Default `CUSTOM`. Controla se o serviço tem preço fixo exibido publicamente ou se está sob orçamento.
- `fixedServiceCheckoutMode`: `FixedServiceCheckoutMode @default(REQUEST_ONLY)`. Só se aplica a serviços `FIXED`. `REQUEST_ONLY` = apenas pedido normal; `REQUIRE_PIX_PAYMENT` = o cliente precisa pagar via Pix para concluir a solicitação.
- `requiresSchedulingDetails`: quando `true`, formulário público exibe campos de data, horário e local.
- `imageUrl String?` / `imageStorageKey String?`: imagem do serviço. Upload via `POST /api/services/[id]/image`, remoção via `DELETE`. Exibida publicamente apenas quando `plan === "PRO"`.

### QuoteRequest

Pedido público de orçamento.

Campos:

- dados do cliente;
- `serviceId` opcional;
- `description` nullable (`String?`) — pedidos de serviços com preço fixo podem não ter descrição do cliente;
- `desiredDate`, `desiredTime`, `location` — nullable no banco para retrocompatibilidade, mas obrigatórios na aplicação quando o serviço usa `requiresSchedulingDetails`;
- status;
- vínculo com `ProviderProfile`.
- `fixedServiceAmount Decimal? @db.Decimal(10, 2)` — snapshot do `basePrice` quando um pedido exige pagamento antecipado. Imutável após criação; páginas de Pix usam este valor, nunca o preço atual do serviço.
- `pixReservationRequestedAt DateTime?` — campo legado preenchido quando o pedido entra no pagamento Pix obrigatório; o nome é mantido para compatibilidade de dados.
- `pixReservationPaidAt DateTime?` — preenchido manualmente pelo prestador ao confirmar recebimento do Pix.

Observação: pedidos novos salvam o serviço escolhido em `serviceId` e mantêm `description` como o texto enviado pelo cliente. O prefixo legado com ID do serviço pode existir apenas em pedidos antigos.

### QuoteRequestStatusHistory

Histórico técnico de mudanças de status de um pedido.

Campos importantes:

- `quoteRequestId`: pedido relacionado.
- `fromStatus`: status anterior, opcional para o primeiro registro.
- `toStatus`: novo status.
- `actor`: origem da mudança (`CUSTOMER`, `PROVIDER` ou `SYSTEM`).
- `note`: descrição técnica curta da mudança.

### QuoteRequestInternalNote

Observação interna do prestador sobre um pedido.

Notas internas são autenticadas, pertencem ao prestador dono do pedido e não devem aparecer em rotas públicas.

### Proposal

Proposta criada a partir de um pedido.

Campos importantes:

- `quoteRequestId`: único.
- `publicToken`: único, usado no link público.
- `pricingMode`: `SIMPLE` ou `ITEMIZED`.
- `title` e `description`: conteúdo opcional da proposta.
- `totalAmount`: `Decimal @db.Decimal(10, 2)`.
- `status`.
- `respondedAt`.
- `depositAmount`: valor opcional do entrada.
- `depositPaidAt`: preenchido manualmente pelo prestador quando confirma recebimento do entrada.

### ProposalStatusHistory

Histórico técnico de mudanças de status de uma proposta.

### ProposalTemplate

Modelo reutilizável de proposta do prestador.

Templates pertencem a um `ProviderProfile` e possuem itens em `ProposalTemplateItem`. A UI em `/dashboard/propostas/templates` gerencia esses modelos, e o formulário de nova proposta copia os dados selecionados para o fluxo de criação; templates não substituem `Proposal` nem `ProposalItem`.

### ProposalTemplateItem

Item reutilizável de um template de proposta.

Campos principais:

- `description`
- `quantity`
- `unitPrice`

Os itens do template servem como fonte para preencher os campos da proposta, mas a proposta criada continua independente.

### ProposalItem

Item da proposta.

Campos monetários:

- `unitPrice`
- `totalPrice`

Ambos usam Decimal.

## Relacionamentos

- `User` 1:1 `ProviderProfile`
- `ProviderProfile` 1:N `Service`
- `ProviderProfile` 1:N `QuoteRequest`
- `ProviderProfile` 1:N `Proposal`
- `ProviderProfile` 1:N `ProposalTemplate`
- `Service` 1:N `QuoteRequest` opcional
- `QuoteRequest` 1:1 `Proposal`
- `QuoteRequest` 1:N `QuoteRequestStatusHistory`
- `QuoteRequest` 1:N `QuoteRequestInternalNote`
- `User` 1:N `QuoteRequestInternalNote`
- `User` 1:N `PasswordResetToken`
- `Proposal` 1:N `ProposalItem`
- `Proposal` 1:N `ProposalStatusHistory`
- `ProposalTemplate` 1:N `ProposalTemplateItem`

## Enums

### QuoteRequestStatus

- `NEW`
- `REVIEWING`
- `PROPOSAL_SENT`
- `CLOSED`

### ProposalStatus

- `DRAFT`
- `SENT`
- `APPROVED`
- `REJECTED`
- `EXPIRED`

### QuoteRequestStatusActor

- `CUSTOMER`
- `PROVIDER`
- `SYSTEM`

### PlanTier

- `FREE`
- `PRO`

### ProposalPricingMode

- `SIMPLE`
- `ITEMIZED`

### ProviderThemePreset

- `DEFAULT`
- `CLEAN`
- `BEAUTY`
- `CREATIVE`
- `PREMIUM`
- `BOLD`

O preset só é aplicado quando `ProviderProfile.plan === "PRO"`. Para `FREE`, o dashboard do profissional e o fluxo público do cliente usam `DEFAULT` mesmo que outro valor esteja salvo. O preset controla tokens globais de cor e fonte, não estilos individuais de componentes.

### ServicePricingType

- `FIXED`: serviço com preço fixo. `basePrice` é obrigatório e exibido publicamente.
- `CUSTOM`: serviço sob orçamento. `basePrice` é opcional.

### CatalogItemType

- `SERVICE`: atendimento, consultoria, trabalho personalizado ou serviço prestado.
- `PRODUCT`: item físico ou digital, kit, encomenda ou produto da vitrine.

`CatalogItemType` é apenas classificatório. Todas as combinações com `ServicePricingType` são válidas.

### FixedServiceCheckoutMode

Controla o fluxo de conversão de serviços com `pricingType = FIXED`.

- `REQUEST_ONLY` (default): cliente envia apenas um pedido normal. Compatível com todos os serviços antigos.
- `REQUIRE_PIX_PAYMENT`: exibe um único CTA "Pagar com Pix". O cliente precisa pagar antecipadamente e o prestador confirma manualmente.

Serviços `CUSTOM` sempre ficam com `REQUEST_ONLY` (forçado na action).

### SubscriptionStatus

- `ACTIVE`
- `TRIALING`
- `PAST_DUE`
- `CANCELED`
- `INCOMPLETE`
- `INCOMPLETE_EXPIRED`
- `UNPAID`
- `PAUSED`

Observação: `EXPIRED` existe no enum de proposta, mas a página pública calcula expiração por `validUntil` no momento da renderização.

## Regras de negócio no banco

- Um usuário só tem um perfil (`userId @unique`).
- Um slug é único.
- Um pedido só pode ter uma proposta (`quoteRequestId @unique`).
- Um pedido pode estar vinculado a um serviço ativo no momento da criação.
- Se um serviço for removido, pedidos vinculados mantêm o pedido e limpam `serviceId`.
- Mudanças de status de pedido devem gerar registros em `QuoteRequestStatusHistory`.
- Mudanças de status de proposta devem gerar registros em `ProposalStatusHistory`.
- Notas internas de pedido devem ser acessíveis apenas pelo prestador dono do pedido.
- Templates de proposta pertencem a um prestador e não devem ser acessados por outros usuários.
- Uma proposta pública deve ser acessada por `publicToken`.
- Pix é manual: o Vitriny gera código Pix/QR Code estático com dados do prestador, mas não processa dinheiro nem recebe confirmação automática.
- Token de redefinição de senha é de uso único e expira em 1 hora.
- Senha de usuário sempre armazenada como hash bcrypt, nunca texto puro.
- Serviço com `pricingType = FIXED` deve ter `basePrice > 0` (validado em Zod, não constraint no banco).
- Serviços antigos sem `pricingType` explícito ficam como `CUSTOM` pelo default.
- Itens antigos ficam como `SERVICE` pelo default de `itemType`.
- `QuoteRequest.description` é nullable; pedidos de serviços FIXED não exigem descrição do cliente.
- `fixedServiceAmount` é um snapshot imutável do `basePrice` no momento em que o pagamento antecipado é criado. Nunca atualizar após criação do pedido.
- `pixReservationPaidAt` só pode ser preenchido pelo prestador autenticado dono do pedido (`markPixReservationPaid`). Nunca expor ao cliente público.
- Pedidos antigos têm `fixedServiceAmount`, `pixReservationRequestedAt` e `pixReservationPaidAt` todos `null` — retrocompatibilidade garantida.
- `fixedServiceCheckoutMode` é forçado como `REQUEST_ONLY` para serviços `CUSTOM` na action, independente do que o formulário enviar.
- `itemType` é visual e organizacional. Não altera regras de preço, Pix, proposta, pedido nem limites de plano.

## Dinheiro e Decimal

Valores monetários usam `Decimal`, nunca `Float`.

Ao criar proposta, a aplicação calcula:

```text
totalPrice = quantity * unitPrice
totalAmount = soma(totalPrice)
```

## Public token

`Proposal.publicToken` é único. A criação atual gera token com `crypto.randomBytes(24).toString("hex")`, resultando em 48 caracteres hexadecimais.

Não usar `Proposal.id` em links públicos.

## Comandos Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npx prisma validate
```

Em produção, aplicar migrations com:

```bash
npx prisma migrate deploy
```

## Migrations

Para criar migration local:

```bash
npm run prisma:migrate -- --name nome-da-migration
```

Antes de mexer no schema:

1. Justificar a mudança.
2. Confirmar que ela é necessária para a etapa.
3. Rodar `npx prisma validate`.
4. Rodar build.
