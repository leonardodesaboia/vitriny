# Roadmap

## Concluído

- Base Next.js + TypeScript + Tailwind
- PostgreSQL + Prisma
- Auth.js / NextAuth
- Dashboard protegido
- Perfil do prestador
- Cadastro de serviços
- Página pública do prestador
- Pedido público de orçamento
- Painel de pedidos recebidos
- Criação de proposta
- Página pública da proposta
- Aprovar ou recusar proposta
- Relação entre pedido e serviço
- Histórico de status do pedido
- Histórico de status da proposta
- Notas internas do pedido
- Templates de proposta
- Editor dinâmico de itens da proposta
- Planos e limites de uso
- Login com Google OAuth e cadastro/login por e-mail e senha (substituindo GitHub OAuth)
- Recuperação de senha por e-mail (Resend)
- Polimento visual, validações e preparação para deploy
- Assinatura mensal PRO via Stripe Checkout embutido, gestão de pagamento, portal, faturas e webhook
- Testes automatizados unitários, de actions, integração com banco real e E2E com Playwright
- Tipos de preço de serviço: FIXED (preço exibido publicamente) e CUSTOM (sob orçamento)
- Exclusão de serviço com confirmação
- Edição de nota do cliente diretamente no card do pedido
- Lista de serviços colapsável com padrão accordion (expandir ao clicar)
- Pagamento antecipado Pix obrigatório para serviços fixos, com confirmação manual
- Entrada Pix em proposta aprovada
- Imagem por serviço para usuários PRO
- Geração autenticada de PDF de proposta
- Temas globais de cores e fontes para usuários PRO
- Filtro de pedidos por status
- Responsividade da página de serviços em telas mobile
- Dashboard operacional com onboarding por tipo de serviço, métricas mensais, atalhos para pendências e atividade recente

## Próximos passos recomendados

1. Fazer teste manual completo em ambiente de staging.
2. Configurar deploy.
3. Configurar banco PostgreSQL de produção.
4. Revisar OAuth em produção.

## Melhorias de curto prazo

- Criar página de detalhe do pedido.
- Melhorar mensagens de erro por campo.
- Adicionar página de configurações do prestador.
- Criar página de detalhe da proposta.
- Verificação de e-mail no cadastro por senha (não implementado nesta etapa).
- Vínculo de contas entre Google e e-mail/senha quando o e-mail coincide (hoje bloqueado deliberadamente, sem auto-merge).
- Trocar remetente do Resend de `onboarding@resend.dev` (sandbox) para domínio verificado.

## Melhorias de médio prazo

- Ampliar cobertura E2E dos fluxos de billing, Pix e personalização.
- Expiração/limpeza de pagamentos Pix obrigatórios abandonados.

## Futuro, somente após validação

- Gateway Pix com confirmação automática.
- Pagamento online do cliente final por cartão.
- WhatsApp API.
- Editor avançado de PDF.
- Assinatura digital.
- IA para sugerir preço.
- Marketplace.
- Multiempresa complexo.
- Aplicativo mobile.

## Não implementar ainda sem validação

- Cobrança do cliente final dentro da plataforma.
- Automação de WhatsApp.
- Gerador avançado de PDF.
- IA de precificação.
- Marketplace.
- Multiempresa com permissões complexas.
