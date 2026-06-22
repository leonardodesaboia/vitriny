# MVP Flow

## Checklist completo

1. Usuário acessa landing page.
2. Usuário faz login.
3. Usuário acessa dashboard.
4. Usuário cria/edita perfil.
5. Usuário publica perfil.
6. Usuário cadastra serviços.
7. Cliente acessa `/u/[slug]`.
8. Cliente envia pedido de orçamento.
9. Prestador vê pedido.
10. Prestador cria proposta.
11. Cliente acessa `/proposta/[publicToken]`.
12. Cliente aprova ou recusa.
13. Prestador vê status atualizado.

## Passo a passo manual

### 1. Login

- Acesse `/login`.
- Entre com GitHub.
- Esperado: redirecionamento para `/dashboard`.

### 2. Perfil

- Acesse `/dashboard/perfil`.
- Preencha `businessName`, `slug`, contatos e marque `isPublished`.
- Salve.
- Esperado: dashboard mostra perfil e link `/u/[slug]`.

### 3. Serviços

- Acesse `/dashboard/servicos`.
- Cadastre serviço ativo.
- Esperado: serviço aparece na listagem.

### 4. Página pública

- Acesse `/u/[slug]`.
- Esperado: perfil e serviços ativos aparecem.
- Serviços inativos não devem aparecer.

### 5. Pedido público

- Clique em `Pedir orçamento`.
- Envie o formulário.
- Esperado: estado de sucesso em `/u/[slug]/orcamento?success=1`.

Como verificar no banco:

- Abrir Prisma Studio com `npm run prisma:studio`.
- Conferir `QuoteRequest` com status `NEW`.

### 6. Painel de pedidos

- Acesse `/dashboard/pedidos`.
- Esperado: pedido aparece na lista.
- Altere status para `REVIEWING` ou `CLOSED`.

### 7. Proposta

- Clique em `Criar proposta`.
- Preencha título, validade e ao menos um item.
- Salve.
- Esperado:
  - `Proposal` criada.
  - `ProposalItem` criado.
  - `QuoteRequest.status` vira `PROPOSAL_SENT`.

Como verificar:

- Prisma Studio em `Proposal`, `ProposalItem` e `QuoteRequest`.

### 8. Página da proposta

- Acesse `/proposta/[publicToken]`.
- Esperado: proposta, itens, total, validade e status aparecem.

### 9. Aprovação/recusa

- Clique em `Aprovar proposta` ou `Recusar proposta`.
- Esperado:
  - `Proposal.status` vira `APPROVED` ou `REJECTED`.
  - `Proposal.respondedAt` é preenchido.
  - `QuoteRequest.status` vira `CLOSED`.

## Erros comuns

### Login não funciona

Verificar:

- `AUTH_URL`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- callback do GitHub OAuth

### Perfil público retorna 404

Verificar:

- slug correto;
- `ProviderProfile.isPublished=true`.

### Serviço não aparece publicamente

Verificar:

- serviço pertence ao perfil correto;
- `Service.isActive=true`.

### Pedido não aparece no painel

Verificar:

- pedido está vinculado ao `ProviderProfile` correto;
- usuário logado é dono do perfil.

### Proposta não pode ser respondida

Verificar:

- status já não é `APPROVED` ou `REJECTED`;
- `validUntil` não está no passado.
