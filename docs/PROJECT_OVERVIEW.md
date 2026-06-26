# Project Overview

## Produto

OrçaFácil é um microSaaS para prestadores de serviço criarem um perfil público, receberem pedidos de orçamento, criarem propostas e compartilharem um link para o cliente aprovar ou recusar.

## Problema

Prestadores costumam receber pedidos por canais soltos, como mensagens e ligações. Isso dificulta organizar informações, acompanhar status e enviar uma proposta clara. O OrçaFácil cria um fluxo mínimo e rastreável.

## Fluxo principal do prestador

1. Faz login.
2. Acessa o dashboard.
3. Cria e publica o perfil.
4. Cadastra serviços.
5. Recebe pedidos enviados pelo link público.
6. Analisa pedido no painel.
7. Cria proposta.
8. Compartilha o link público da proposta.
9. Acompanha aprovação ou recusa.

## Fluxo principal do cliente

1. Acessa `/u/[slug]`.
2. Consulta dados e serviços do prestador.
3. Envia pedido em `/u/[slug]/orcamento`, com o serviço pré-selecionado quando acessa a partir de um card de serviço.
4. Recebe/acessa link da proposta.
5. Aprova ou recusa em `/proposta/[publicToken]`.

## Entidades principais

- `User`: usuário autenticado.
- `ProviderProfile`: perfil do prestador.
- `Service`: serviço oferecido.
- `QuoteRequest`: pedido público de orçamento.
- `QuoteRequestStatusHistory`: histórico de status do pedido.
- `QuoteRequestInternalNote`: nota interna do pedido.
- `Proposal`: proposta vinculada a um pedido.
- `ProposalItem`: item de proposta.
- `ProposalStatusHistory`: histórico de status da proposta.
- `ProposalTemplate`: modelo reutilizável de proposta.
- `ProposalTemplateItem`: item reutilizável do template.
- `PlanTier`: plano comercial do prestador para aplicar limites de uso.
- `PasswordResetToken`: token de uso único para redefinição de senha.

## Glossário

- Prestador: usuário autenticado que oferece serviços.
- Cliente: pessoa pública que envia pedido ou responde proposta.
- Slug: identificador público do perfil em `/u/[slug]`.
- Public token: token público e imprevisível da proposta.
- Pedido: solicitação inicial de orçamento.
- Proposta: resposta comercial do prestador ao pedido.

## Rotas públicas

- `/`: landing page.
- `/login`: login (Google OAuth ou e-mail/senha).
- `/cadastro`: cadastro com e-mail/senha (ou Google).
- `/esqueci-senha`: solicitar redefinição de senha.
- `/redefinir-senha/[token]`: definir nova senha a partir do token recebido por e-mail.
- `/u/[slug]`: perfil público do prestador publicado.
- `/u/[slug]/orcamento`: formulário público de pedido, com seleção implícita do serviço quando a URL vem de um card do perfil.
- `/proposta/[publicToken]`: página pública da proposta.
- `/api/auth/[...nextauth]`: rota Auth.js.

## Rotas autenticadas

- `/dashboard`: painel inicial.
- `/dashboard/perfil`: edição do perfil do prestador.
- `/dashboard/servicos`: gerenciamento de serviços.
- `/dashboard/pedidos`: painel de pedidos recebidos.
- `/dashboard/propostas/nova?requestId=...`: criação de proposta.
- `/dashboard/propostas/templates`: gerenciamento de templates de proposta.

## Decisões de produto

- O MVP é focado em um prestador individual por usuário.
- O perfil público usa `/u/[slug]`.
- A proposta pública usa `/proposta/[publicToken]`.
- A página pública da proposta não usa ID interno.
- O cliente não precisa de login.
- Login do prestador é por Google OAuth ou e-mail/senha; GitHub OAuth foi removido.
- Planos e limites de uso preparam a monetização, mas não cobram nada no MVP.
- Gateway de pagamento, confirmação automática de Pix, WhatsApp API, PDF avançado e IA estão fora do MVP. Pix manual para entrada de proposta aprovada existe sem processamento financeiro pelo OrçaFácil.
