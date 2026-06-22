# Database

## Visão geral

O banco usa PostgreSQL com Prisma. O schema fica em `prisma/schema.prisma`.

## Models

### User

Usuário autenticado pelo Auth.js. Relaciona-se com:

- `ProviderProfile`
- `Account`
- `Session`

### Account

Conta OAuth usada pelo Auth.js/Prisma Adapter.

### Session

Sessão persistida do Auth.js.

### VerificationToken

Modelo padrão do Auth.js. No fluxo atual com GitHub OAuth, não é parte central da experiência.

### ProviderProfile

Perfil do prestador.

Campos importantes:

- `slug`: URL pública em `/u/[slug]`.
- `isPublished`: controla se o perfil aparece publicamente.

Relaciona-se com:

- `User`
- `Service`
- `QuoteRequest`
- `Proposal`

### Service

Serviço oferecido pelo prestador.

Campos importantes:

- `basePrice`: `Decimal? @db.Decimal(10, 2)`.
- `isActive`: controla se aparece publicamente.

### QuoteRequest

Pedido público de orçamento.

Campos:

- dados do cliente;
- descrição;
- status;
- vínculo com `ProviderProfile`.

Observação: não há `serviceId` no schema atual. O serviço escolhido é armazenado no texto de `description` pela implementação atual.

### Proposal

Proposta criada a partir de um pedido.

Campos importantes:

- `quoteRequestId`: único.
- `publicToken`: único, usado no link público.
- `totalAmount`: `Decimal @db.Decimal(10, 2)`.
- `status`.
- `respondedAt`.

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
- `QuoteRequest` 1:1 `Proposal`
- `Proposal` 1:N `ProposalItem`

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

Observação: `EXPIRED` existe no enum, mas a página pública calcula expiração por `validUntil` no momento da renderização.

## Regras de negócio no banco

- Um usuário só tem um perfil (`userId @unique`).
- Um slug é único.
- Um pedido só pode ter uma proposta (`quoteRequestId @unique`).
- Uma proposta pública deve ser acessada por `publicToken`.

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
