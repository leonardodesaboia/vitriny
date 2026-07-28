# Project Overview

## Produto

Vitriny é uma vitrine online para pequenos negócios apresentarem produtos e serviços, receberem pedidos, enviarem propostas e oferecerem pagamento via Pix manual.

O produto não é um e-commerce completo. Não há carrinho, checkout automático, estoque, frete, variações de produto, confirmação automática de Pix nem marketplace no MVP.

## Problema

Pequenos negócios costumam receber pedidos por canais soltos, como mensagens e ligações. Isso dificulta organizar informações, acompanhar status e enviar um retorno ou proposta clara. O Vitriny cria um fluxo mínimo e rastreável.

## Fluxo principal do negócio

1. Faz login.
2. Acessa o dashboard.
3. Cadastra os dados do negócio e publica a vitrine.
4. Cadastra produtos e serviços como itens da vitrine.
5. Recebe pedidos enviados pelo link público.
6. Filtra e analisa pedidos por status no painel.
7. Cria proposta.
8. Compartilha o link público da proposta.
9. Acompanha aprovação ou recusa.

## Fluxo principal do cliente

1. Acessa `/u/[slug]`.
2. Consulta os produtos e serviços do negócio.
3. Envia pedido em `/u/[slug]/orcamento`, sempre vinculado a um item da vitrine e com ao menos e-mail ou telefone; itens `CUSTOM` exigem descrição; data/horário (`requiresSchedulingDetails`) e local (`requiresLocation`) são exigências independentes, configuráveis por item.
4. Para item `FIXED`, envia apenas a solicitação e aguarda o retorno do negócio para combinar o pagamento.
5. Recebe/acessa link da proposta.
6. Aprova ou recusa em `/proposta/[publicToken]`.

## Entidades principais

- `User`: usuário autenticado.
- `ProviderProfile`: perfil do negócio / vitrine pública.
- `Service`: item da vitrine. Classificado visualmente como `PRODUCT` ou `SERVICE` via `itemType`; `itemType` não altera regras de negócio.
- `QuoteRequest`: pedido / solicitação pública.
- `QuoteRequestStatusHistory`: histórico de status do pedido.
- `QuoteRequestInternalNote`: nota interna do pedido.
- `Proposal`: proposta vinculada a um pedido (fluxo de itens sob consulta).
- `ProposalItem`: item de proposta.
- `ProposalStatusHistory`: histórico de status da proposta.
- `ProposalTemplate`: modelo reutilizável de proposta.
- `ProposalTemplateItem`: item reutilizável do template.
- `PlanTier`: plano comercial do negócio para aplicar limites de uso.
- `ProviderThemePreset`: preset visual salvo para personalização simples da aplicação por tokens globais de cor e fonte.
- `StorefrontView`: contagem de visitas da vitrine agregada por dia (`(providerId, date)`).
- `ItemView`: contagem de views (interesse) por item, agregada por dia (`(serviceId, date)`).
- `PasswordResetToken`: token de uso único para redefinição de senha.

## Glossário

### Termos de produto

- **Negócio**: usuário autenticado que apresenta produtos ou serviços na Vitriny.
- **Cliente**: pessoa pública que envia pedido ou responde proposta.
- **Vitrine pública**: página em `/u/[slug]` com os dados do negócio e os itens disponíveis.
- **Item da vitrine**: cada produto ou serviço cadastrado pelo negócio.
- **Pedido / solicitação**: formulário enviado pelo cliente a partir da vitrine pública.
- **Proposta**: resposta comercial do negócio ao pedido, com valores, prazo e link para aprovação.
- **Pagamento via Pix**: manual, feito diretamente ao negócio. O Vitriny gera QR Code e código copia e cola, mas não processa nem confirma automaticamente.

### Mapeamento UI ↔ técnico

| UI / produto | Técnico (código e banco) | Observação |
|---|---|---|
| item da vitrine | `Service` | Não renomear o model |
| Produto / Serviço | `Service.itemType` (`PRODUCT` \| `SERVICE`) | Classificação visual apenas |
| modo de venda | `ServiceSaleMode` em `lib/service-sale-mode.ts` | Helper de UI; não existe no banco |
| Sob consulta | `pricingType = CUSTOM` | |
| Preço fixo | `pricingType = FIXED` | Cliente solicita; pagamento combinado à parte |
| pedido / solicitação | `QuoteRequest` | Não renomear o model |
| proposta | `Proposal` | |
| vitrine pública / perfil do negócio | `ProviderProfile` publicado | |
| endereço da vitrine | `ProviderProfile.slug` | `/u/[slug]` |

Os models `Service`, `ProviderProfile`, `QuoteRequest` e `Proposal`, as rotas e os enums mantêm seus nomes internos originais.

## Rotas públicas

- `/`: landing page.
- `/login`: login (Google OAuth ou e-mail/senha).
- `/cadastro`: cadastro com e-mail/senha (ou Google).
- `/verifique-seu-email`: aviso e reenvio da confirmação de contas Credentials pendentes.
- `/verificar-email/[token]`: confirmação explícita do endereço antes do primeiro login por senha.
- `/esqueci-senha`: solicitar redefinição de senha.
- `/redefinir-senha/[token]`: definir nova senha a partir do token recebido por e-mail.
- `/u/[slug]`: vitrine pública do negócio.
- `/u/[slug]/orcamento`: formulário público de pedido, com seleção implícita do serviço quando a URL vem de um card do perfil.
- `/proposta/[publicToken]`: página pública da proposta.
- `/api/auth/[...nextauth]`: rota Auth.js.

## Rotas autenticadas

- `/dashboard`: painel inicial.
- `/dashboard/perfil`: edição dos dados e da vitrine do negócio.
- `/dashboard/servicos`: gerenciamento de itens da vitrine (rota técnica/legada).
- `/dashboard/pedidos`: painel de pedidos recebidos.
- `/dashboard/propostas/nova?requestId=...`: criação de proposta.
- `/dashboard/propostas/templates`: gerenciamento de templates de proposta. Acessível pelo fluxo de proposta (link "Gerenciar/Criar modelo" em `propostas/nova`), não pelo menu lateral.
- `/dashboard/billing`: plano, uso, assinatura, forma de pagamento e faturas.

Route handlers autenticados ou server-to-server:

- `/api/billing/invoices`: lista faturas do cliente Stripe autenticado.
- `/api/proposals/[id]/pdf`: gera PDF de proposta aprovada ou recusada após validar autenticação e ownership.
- `/api/services/[id]/image`: envia ou remove imagem de serviço após validar ownership (foto por item é disponível em todos os planos).
- `/api/stripe/webhook`: recebe eventos Stripe com validação de assinatura.

## Decisões de produto

- O MVP é focado em um pequeno negócio por usuário.
- A vitrine pública usa `/u/[slug]`.
- A proposta pública usa `/proposta/[publicToken]`.
- A página pública da proposta não usa ID interno.
- O cliente não precisa de login.
- Login do negócio é por Google OAuth ou e-mail/senha; GitHub OAuth foi removido.
- O plano PRO possui cobrança recorrente via Stripe; limites e acesso a temas visuais dependem do plano persistido no perfil. Foto por item é disponível em todos os planos.
- **Recursos de identidade são FREE**: endereço, redes sociais e horário de funcionamento com badge "Aberto agora" ficam disponíveis em todos os planos. Identidade do negócio não é gatilho de upgrade; os limites PRO continuam nos recursos que o dono sente (itens e propostas ilimitados, temas visuais). Foto por item também é FREE — o limite de 3 itens já limita a 3 fotos.
- **Links customizados do perfil são FREE**: além de Instagram/Facebook/TikTok, o dono adiciona até 10 links livres (rótulo + URL) exibidos na vitrine pública. Recurso de identidade, disponível em todos os planos. URLs aceitam só `http`/`https` (validado em `lib/profile-links.ts`).
- **Estatísticas de visitas são FREE**: a dashboard mostra quantas vezes a vitrine foi vista (últimos 7/30 dias). Contagem via beacon client, agregada por dia, sem PII/cookie (dedupe por sessão em `sessionStorage`); exclui o dono logado e bots. Detalhe por item/origem fica para a fase 2 (PRO).
- **Itens mais vistos são PRO**: a dashboard mostra o ranking dos itens que mais geram interesse (abertura da página de orçamento do item, últimos 30 dias). FREE vê um card de upsell. Gating via `canUseStorefrontAnalytics`. Origem do tráfego fica para a fase 3 (links marcados — referrer é enganoso em navegadores in-app).
- Temas visuais da aplicação são recurso PRO e afetam o dashboard do profissional e o fluxo público do cliente. FREE sempre renderiza o tema padrão, mesmo que exista outro preset salvo por uso anterior do PRO. Os temas alteram apenas tokens globais de cor e fonte, não layout ou classes específicas por componente.
- **`itemType` é classificação visual**: `PRODUCT` e `SERVICE` organizam a vitrine visualmente, mas não alteram preço, propostas, pedidos nem limites. As regras de negócio continuam dependendo de `pricingType`.
- **O tipo do negócio orienta novos itens**: perfis configurados somente para produtos ou somente para serviços recebem `itemType` automaticamente na criação. O seletor Produto/Serviço aparece apenas para perfis que oferecem ambos.
- **Não existem dois produtos separados no banco**: Produto e Serviço são classificações do mesmo model `Service`. Não haverá separação em dois models distintos sem decisão explícita.
- **Proposta existe apenas para itens sob consulta (`CUSTOM`)**: itens com preço fixo não passam pelo fluxo de proposta.
- **Modelos de proposta são contextuais ao fluxo de proposta**: como proposta só existe para itens `CUSTOM`, a gestão de modelos foi tirada do menu lateral e passou a viver dentro de `propostas/nova` (aplicar modelo por chip, "Gerenciar/Criar modelo" e "Salvar esta proposta como modelo" no modo Itens detalhados). A página `/dashboard/propostas/templates` continua existindo, mas não é destino de navegação primária. Isso evita que negócios só de produto — que nunca enviam proposta — vejam a feature no menu.
- Gateway de pagamento do cliente final, confirmação automática de Pix, carrinho, estoque, frete, variações, cupons, WhatsApp API, editor avançado de PDF, IA e marketplace estão fora do MVP e só serão considerados após validação de negócio.
- Pix manual existe apenas na entrada de proposta aprovada. O Vitriny gera QR Code/código estático, mas não movimenta dinheiro nem recebe webhook Pix. O pagamento antecipado obrigatório de item `FIXED` (fluxo de reserva/"pagar com Pix") foi removido: itens de preço fixo só geram solicitação, e o pagamento é combinado diretamente entre cliente e negócio.
- Stripe é usado exclusivamente para assinatura do usuário da Vitriny; nunca para pagamento do cliente final.
