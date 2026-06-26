# MVP Flow

## Checklist completo

1. Usuário acessa landing page.
2. Usuário faz login.
3. Usuário acessa dashboard.
4. Usuário confere plano atual e uso dos limites.
5. Usuário cria/edita perfil.
6. Usuário publica perfil.
7. Usuário cadastra serviços.
8. Cliente acessa `/u/[slug]`.
9. Cliente envia pedido de orçamento.
10. Prestador vê pedido.
11. Prestador cria proposta.
12. Cliente acessa `/proposta/[publicToken]`.
13. Cliente aprova ou recusa.
14. Se houver entrada Pix, cliente paga diretamente ao prestador e envia comprovante.
15. Prestador vê status atualizado e marca o entrada como recebido.

## Passo a passo manual

### 1. Login

- Acesse `/login`.
- Entre com Google, ou clique em "Cadastre-se" para criar conta com e-mail/senha em `/cadastro`.
- Esperado: redirecionamento para `/dashboard`.

### 1a. Recuperação de senha (apenas contas com senha)

- Acesse `/esqueci-senha`, informe o e-mail.
- Esperado: mensagem de sucesso genérica, sempre a mesma (mesmo se o e-mail não existir).
- Se o e-mail tiver senha cadastrada, chega um link de redefinição (via Resend).
- Acesse `/redefinir-senha/[token]`, defina nova senha.
- Esperado: redirecionamento para `/login?reset=1`, login funciona com a nova senha.

### 2. Perfil

- Acesse `/dashboard/perfil`.
- Preencha `businessName`, endereço do perfil, contatos, dados Pix se quiser receber entrada, e marque `isPublished`.
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
- Se o acesso vier de um card de serviço, o formulário já abre com esse serviço selecionado e sem o seletor de serviços.
- Envie o formulário.
- Esperado: estado de sucesso em `/u/[slug]/orcamento?success=1`.
- Se `RESEND_API_KEY` e `EMAIL_FROM` estiverem configurados, o prestador recebe e-mail avisando sobre o novo pedido.

Como verificar no banco:

- Abrir Prisma Studio com `npm run prisma:studio`.
- Conferir `QuoteRequest` com status `NEW`.

### 6. Painel de pedidos

- Acesse `/dashboard/pedidos`.
- Esperado: pedido aparece na lista.
- Altere status para `REVIEWING` ou `CLOSED`.

### 7. Proposta

- Clique em `Criar proposta`.
- Preencha título, validade, ao menos um item e, se quiser cobrar entrada, o valor do entrada.
- Salve.
- Esperado:
  - `Proposal` criada.
  - `ProposalItem` criado.
  - `QuoteRequest.status` vira `PROPOSAL_SENT`.
  - Se o pedido tiver e-mail do cliente, o cliente recebe um link da proposta por e-mail.

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
  - O prestador recebe e-mail avisando se a proposta foi aprovada ou recusada.

### 10. Pix manual para entrada

- Se a proposta aprovada tiver `depositAmount > 0` e o prestador tiver `pixKey`, `pixHolderName` e `pixCity`, a página pública mostra QR Code Pix e código Pix copia e cola.
- Esperado: cliente vê as mensagens:
  - "Pagamento feito diretamente ao prestador."
  - "O OrçaFácil não confirma esse pagamento automaticamente."
  - "Após pagar, envie o comprovante ao prestador ou combine a confirmação diretamente com ele."
- Cliente paga fora da plataforma e envia o comprovante ao prestador.
- Prestador acessa `/dashboard/pedidos` e clica em `Marcar como recebido`.
- Esperado: `Proposal.depositPaidAt` é preenchido e o painel mostra entrada recebido.

## Erros comuns

### Login não funciona

Verificar:

- `AUTH_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- callback do Google OAuth
- se for login por senha: e-mail/senha corretos, e se a conta não foi criada via Google (`password` nulo)

### E-mail não chega

Verificar:

- `RESEND_API_KEY` configurada
- `EMAIL_FROM` configurado com remetente validado no Resend
- se o e-mail informado tem senha cadastrada (contas só-Google não recebem e-mail de reset)
- se o cliente informou e-mail no pedido (necessário para receber proposta)
- se o perfil do prestador tem e-mail; caso contrário, o app tenta usar o e-mail da conta

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
