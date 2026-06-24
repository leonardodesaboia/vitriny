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
- Planos e limites de uso sem checkout real
- Login com Google OAuth e cadastro/login por e-mail e senha (substituindo GitHub OAuth)
- Recuperação de senha por e-mail (Resend)
- Polimento visual, validações e preparação para deploy
- Assinatura mensal PRO via Stripe Checkout (sem checkout próprio, sem coleta de cartão)
- Testes automatizados: unitários (179), integração com banco real (24) e E2E com Playwright

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

- Envio de e-mail para notificar pedido e proposta.
- Exportação simples de proposta.
- Métricas básicas do prestador.

## Futuro, somente após validação

- Pix.
- Pagamento real.
- Checkout de upgrade.
- WhatsApp API.
- PDF avançado.
- Assinatura digital.
- IA para sugerir preço.
- Planos pagos.
- Marketplace.
- Multiempresa complexo.
- Aplicativo mobile.

## Não implementar ainda sem validação

- Cobrança recorrente.
- Automação de WhatsApp.
- Gerador avançado de PDF.
- IA de precificação.
- Marketplace.
- Multiempresa com permissões complexas.
