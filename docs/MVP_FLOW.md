# MVP Flow

## Checklist completo

1. Usuário acessa landing page.
2. Usuário faz login.
3. Usuário acessa dashboard.
4. Usuário confere plano atual, uso dos limites, métricas do mês, pendências e as cinco movimentações mais recentes.
5. Usuário cria/edita perfil.
6. Usuário publica perfil.
7. Usuário cadastra serviços.
8. Cliente acessa `/u/[slug]`.
9. Cliente envia pedido; quando o serviço `FIXED` usa `REQUIRE_PIX_PAYMENT`, segue obrigatoriamente para o Pix.
10. Prestador vê pedido.
11. Prestador cria proposta (apenas para serviços CUSTOM).
12. Cliente acessa `/proposta/[publicToken]`.
13. Cliente aprova ou recusa.
14. Se houver entrada Pix, cliente paga diretamente ao prestador e envia comprovante.
15. Prestador vê status atualizado e marca o entrada como recebido.

Fluxo alternativo — Pagamento Pix obrigatório (serviços FIXED):

9a. Cliente clica em "Pagar com Pix" no card do serviço.
9b. Cliente preenche dados e envia formulário.
9c. Cliente é redirecionado para `/u/[slug]/reserva/[requestId]` com QR Code + código copia e cola.
9d. Cliente realiza o pagamento Pix diretamente ao prestador.
9e. Cliente avisa o prestador e envia o comprovante.
9f. Prestador acessa `/dashboard/pedidos`, expande o pedido e clica em "Confirmar recebimento".
9g. `pixReservationPaidAt` é preenchido e o painel exibe badge "Pagamento Pix confirmado".

Compatibilidade legada — Pagamento Pix direto:

- `/u/[slug]/pagamento/[requestId]` continua abrindo links criados pelo fluxo antigo.
- Novos pedidos nunca são redirecionados para essa rota.
- A página informa que o pagamento é manual e não oferece um estado de confirmação inexistente.

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
- Preencha `businessName`, endereço do perfil, contatos, aparência da página, dados Pix se quiser receber entrada, e marque `isPublished`.
- Em plano FREE, a aplicação usa o tema padrão. Em plano PRO, escolha um preset visual e salve.
- Salve.
- Esperado: dashboard mostra perfil e link `/u/[slug]`; dashboard do profissional e fluxo público do cliente usam o mesmo tema global de cor e fonte.

### 3. Serviços

- Acesse `/dashboard/servicos`.
- Cadastre serviço ativo.
- Para serviços `FIXED`: ative "Exigir pagamento antecipado via Pix" quando o cliente precisar pagar para concluir a solicitação (requer dados Pix configurados no perfil).
- Esperado: serviço aparece na listagem.

### 4. Página pública

- Acesse `/u/[slug]`.
- Esperado: perfil e serviços ativos aparecem.
- Serviços inativos não devem aparecer.

### 5. Pedido público

- Clique em `Pedir orçamento` para serviço `CUSTOM`, `Solicitar serviço` para `FIXED` em `REQUEST_ONLY` ou `Pagar com Pix` para `FIXED` em `REQUIRE_PIX_PAYMENT`.
- Se o acesso vier de um card de serviço, o formulário já abre com esse serviço selecionado e sem o seletor de serviços.
- Informe ao menos um contato válido: e-mail ou telefone.
- Para serviço `CUSTOM` ou pedido sem serviço selecionado, descreva obrigatoriamente o que precisa.
- Quando o serviço exige agendamento, informe uma data real que não esteja no passado, além de horário/período e local.
- Envie o formulário.
- Para serviço `CUSTOM` ou `FIXED` em `REQUEST_ONLY`, esperado: estado de sucesso em `/u/[slug]/orcamento?success=1`.
- Para serviço `FIXED` em `REQUIRE_PIX_PAYMENT`, esperado: `/u/[slug]/reserva/[requestId]` com QR Code e valor de `fixedServiceAmount`.
- Se o Pix obrigatório deixou de estar configurado, esperado: o pedido não é criado e a página mostra `payment-unavailable`.
- Se `RESEND_API_KEY` e `EMAIL_FROM` estiverem configurados, o prestador recebe e-mail avisando sobre o novo pedido.

### 5a. Pagamento Pix obrigatório (serviços FIXED com REQUIRE_PIX_PAYMENT)

- Clique em `Pagar com Pix` no card do serviço (visível quando `fixedServiceCheckoutMode = REQUIRE_PIX_PAYMENT` e os dados Pix estão configurados).
- O formulário informa que o pagamento é obrigatório e exibe o valor em destaque.
- Envie o formulário.
- Esperado: redirecionamento para `/u/[slug]/reserva/[requestId]` com QR Code Pix e código copia e cola.
- O valor exibido é o snapshot `fixedServiceAmount` — não muda mesmo se o prestador alterar o preço depois.

Como verificar no banco:

- Abrir Prisma Studio com `npm run prisma:studio`.
- Conferir `QuoteRequest` com status `NEW`.

### 6. Painel de pedidos

- Acesse `/dashboard/pedidos`.
- Esperado: pedido aparece na lista.
- Use os filtros de status (`Todos`, `Novo`, `Em análise`, `Proposta enviada`, `Fechado`) para validar a listagem filtrada.
- Confirme que apenas o filtro selecionado tem destaque e que um `?status=` inválido volta para `Todos`.
- A partir da dashboard, abra as visões rápidas por `?view=MONTH|OPEN|APPROVED_MONTH|PIX_RESERVATION|DEPOSIT` e confirme que o título da visão e a opção de limpar filtro aparecem.
- Volte à dashboard e confirme que novos pedidos, mudanças de proposta e confirmações Pix aparecem em ordem decrescente na seção `Atividade recente`, limitada a cinco itens.
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
  - "O Vitriny não confirma esse pagamento automaticamente."
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
