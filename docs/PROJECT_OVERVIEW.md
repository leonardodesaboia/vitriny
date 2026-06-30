# Project Overview

## Produto

Vitriny é um microSaaS para prestadores de serviço criarem um perfil público, receberem pedidos de orçamento, criarem propostas e compartilharem um link para o cliente aprovar ou recusar.

## Problema

Prestadores costumam receber pedidos por canais soltos, como mensagens e ligações. Isso dificulta organizar informações, acompanhar status e enviar uma proposta clara. O Vitriny cria um fluxo mínimo e rastreável.

## Fluxo principal do prestador

1. Faz login.
2. Acessa o dashboard.
3. Cria e publica o perfil.
4. Cadastra serviços.
5. Recebe pedidos enviados pelo link público.
6. Filtra e analisa pedidos por status no painel.
7. Cria proposta.
8. Compartilha o link público da proposta.
9. Acompanha aprovação ou recusa.

## Fluxo principal do cliente

1. Acessa `/u/[slug]`.
2. Consulta dados e serviços do prestador.
3. Envia pedido em `/u/[slug]/orcamento`, com ao menos e-mail ou telefone; serviços `CUSTOM` exigem descrição e serviços configurados para agendamento exigem data, horário e local.
4. Para serviço `FIXED` com `REQUIRE_PIX_PAYMENT`, paga obrigatoriamente em `/u/[slug]/reserva/[requestId]` após enviar os dados.
5. Para serviço `FIXED` com `REQUEST_ONLY`, envia apenas a solicitação e aguarda o prestador.
6. Recebe/acessa link da proposta.
7. Aprova ou recusa em `/proposta/[publicToken]`.

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
- `ProviderThemePreset`: preset visual salvo para personalização simples da aplicação por tokens globais de cor e fonte.
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
- `/u/[slug]/orcamento`: formulário público de pedido, com seleção implícita do serviço quando a URL vem de um card do perfil. Serviços configurados com `REQUIRE_PIX_PAYMENT` informam o pagamento obrigatório antes do envio.
- `/u/[slug]/reserva/[requestId]`: página de pagamento antecipado Pix com QR Code e código copia e cola. Acessível sem login; exige que o pedido tenha `pixReservationRequestedAt` preenchido.
- `/u/[slug]/pagamento/[requestId]`: compatibilidade para links de pagamento direto criados antes de `REQUIRE_PIX_PAYMENT`; não é usado por novos pedidos.
- `/proposta/[publicToken]`: página pública da proposta.
- `/api/auth/[...nextauth]`: rota Auth.js.

## Rotas autenticadas

- `/dashboard`: painel inicial.
- `/dashboard/perfil`: edição do perfil do prestador.
- `/dashboard/servicos`: gerenciamento de serviços.
- `/dashboard/pedidos`: painel de pedidos recebidos.
- `/dashboard/propostas/nova?requestId=...`: criação de proposta.
- `/dashboard/propostas/templates`: gerenciamento de templates de proposta.
- `/dashboard/billing`: plano, uso, assinatura, forma de pagamento e faturas.

Route handlers autenticados ou server-to-server:

- `/api/billing/invoices`: lista faturas do cliente Stripe autenticado.
- `/api/proposals/[id]/pdf`: gera PDF de proposta aprovada ou recusada após validar autenticação e ownership.
- `/api/services/[id]/image`: envia ou remove imagem de serviço após validar plano PRO e ownership.
- `/api/stripe/webhook`: recebe eventos Stripe com validação de assinatura.

## Decisões de produto

- O MVP é focado em um prestador individual por usuário.
- O perfil público usa `/u/[slug]`.
- A proposta pública usa `/proposta/[publicToken]`.
- A página pública da proposta não usa ID interno.
- O cliente não precisa de login.
- Login do prestador é por Google OAuth ou e-mail/senha; GitHub OAuth foi removido.
- O plano PRO possui cobrança recorrente via Stripe; limites e acesso a temas/imagens dependem do plano persistido no perfil.
- Temas visuais da aplicação são recurso PRO e afetam o dashboard do profissional e o fluxo público do cliente. FREE sempre renderiza o tema padrão, mesmo que exista outro preset salvo por uso anterior do PRO. Os temas alteram apenas tokens globais de cor e fonte, não layout ou classes específicas por componente.
- Gateway de pagamento do cliente final, confirmação automática de Pix, WhatsApp API, editor avançado de PDF e IA estão fora do MVP.
- Pix manual existe na entrada de proposta aprovada e no pagamento antecipado obrigatório de serviço `FIXED`. O Vitriny gera QR Code/código estático, mas não movimenta dinheiro nem recebe webhook Pix.
