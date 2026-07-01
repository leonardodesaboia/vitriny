# Roadmap

## Direção de produto

O Vitriny atende pequenos negócios que apresentam produtos e serviços. A interface usa “itens da vitrine”, “vitrine pública” e “pedidos”, enquanto models, enums e rotas mantêm a nomenclatura técnica original.

## Concluído

- Base Next.js + TypeScript + Tailwind
- PostgreSQL + Prisma
- Auth.js / NextAuth
- Dashboard protegido
- Dados do negócio
- Cadastro de itens da vitrine
- Classificação visual de itens como Produto ou Serviço
- Vitrine pública do negócio
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
- Tipos de preço de item: `FIXED` (preço exibido publicamente) e `CUSTOM` (sob consulta)
- Exclusão de item com confirmação
- Edição de nota do cliente diretamente no card do pedido
- Lista de itens colapsável com padrão accordion (expandir ao clicar)
- Pagamento Pix obrigatório para itens com preço fixo, com confirmação manual
- Entrada Pix em proposta aprovada
- Imagem por item para usuários PRO
- Geração autenticada de PDF de proposta
- Temas globais de cores e fontes para usuários PRO
- Filtro de pedidos por status
- Responsividade da tela de itens da vitrine em mobile
- Dashboard operacional com onboarding por tipo de item, métricas mensais, atalhos para pendências e atividade recente
- Modos de venda na UI: Sob consulta, Preço fixo solicitar primeiro, Preço fixo pagar via Pix (`lib/service-sale-mode.ts`)
- Documentação canônica atualizada: posicionamento como vitrine online, glossário técnico↔UI, guardrails anti-e-commerce

## Próximos passos recomendados

1. Fazer teste manual completo em ambiente de staging.
2. Configurar deploy.
3. Configurar banco PostgreSQL de produção.
4. Revisar OAuth em produção.

## Melhorias de curto prazo

- Criar página de detalhe do pedido.
- Melhorar mensagens de erro por campo.
- Adicionar página de configurações do negócio.
- Criar página de detalhe da proposta.
- Verificação de e-mail no cadastro por senha (não implementado nesta etapa).
- Vínculo de contas entre Google e e-mail/senha quando o e-mail coincide (hoje bloqueado deliberadamente, sem auto-merge).
- Trocar remetente do Resend de `onboarding@resend.dev` (sandbox) para domínio verificado.

## Melhorias de médio prazo

- Ampliar cobertura E2E dos fluxos de billing, Pix e personalização.
- Expiração/limpeza de pagamentos Pix obrigatórios abandonados.

## Futuro distante — somente após validação de negócio

Estas features não fazem parte do MVP e não devem ser iniciadas sem uma decisão explícita de produto. O Vitriny não é e-commerce completo nesta etapa.

**Extensões de vitrine (candidatos a curto prazo, se validados):**
- Domínio próprio para a vitrine.
- Página de detalhe público de item.
- Cupons ou desconto simples.

**E-commerce progressivo (médio prazo, requer validação):**
- Controle de estoque básico por item.
- Variações de produto (cor, tamanho, modelo).
- Carrinho de compras.
- Cálculo de frete/entrega.
- Gateway Pix com confirmação automática.
- Pagamento online do cliente final por cartão.

**Infraestrutura e integrações (longo prazo):**
- WhatsApp API (notificações automáticas).
- Assinatura digital.
- Editor avançado de PDF.
- IA para sugerir preço ou descrever item.
- Aplicativo mobile.

**Escala (hipóteses distantes, alta condicionalidade):**
- Marketplace de múltiplos vendedores.
- Multiempresa com permissões complexas.
