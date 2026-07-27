# Vitriny — Agent Instructions

## Produto

Vitriny é um microSaaS para prestadores de serviço criarem um link público de orçamento, receberem pedidos organizados, enviarem propostas e permitirem que clientes aprovem ou recusem por link.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth

Não usar Supabase como backend.

## Regra principal

Nunca implementar o projeto inteiro de uma vez.

Sempre seguir este ciclo:

1. Entender a tarefa
2. Propor plano
3. Listar arquivos que serão criados/alterados
4. Implementar apenas a etapa aprovada
5. Rodar verificação possível
6. Explicar o diff
7. Atualizar README quando necessário

## MVP

O MVP atual contém:

1. Landing page
2. Login
3. Perfil público do prestador
4. Cadastro de serviços
5. Formulário público de pedido de orçamento
6. Painel de pedidos recebidos
7. Criação de proposta
8. Página pública da proposta
9. Botões de aprovar/recusar proposta

## Documentação do projeto

Além deste arquivo, consulte:

- `README.md` — entrada principal, setup, deploy e checklist
- `docs/PROJECT_OVERVIEW.md` — visão de produto
- `docs/ARCHITECTURE.md` — arquitetura técnica
- `docs/DATABASE.md` — schema e regras de banco
- `docs/AUTH.md` — autenticação
- `docs/MVP_FLOW.md` — teste manual completo
- `docs/ROADMAP.md` — próximos passos
- `docs/AI_HANDOFF.md` — handoff para IA/desenvolvedores

Ao alterar rotas, schema, Auth, variáveis de ambiente ou fluxo do MVP, atualizar a documentação correspondente.

## Uso do Graphify pela IA

Quando `graphify-out/graph.json` existir, usar o Graphify como mapa do codebase antes de mudanças que envolvam arquitetura, fluxo do MVP, refatoração, autenticação, banco, rotas, componentes compartilhados ou investigação de impacto.

Fluxo recomendado:

1. Para entender uma área antes de editar, rodar `graphify query "<pergunta>"`.
2. Para avaliar impacto antes de refatorar ou alterar helpers compartilhados, rodar `graphify affected "<nó>"`.
3. Para investigar dependência entre dois pontos, rodar `graphify path "<origem>" "<destino>"`.
4. Para entender um nó central, rodar `graphify explain "<nó>"`.
5. Depois de mudanças relevantes em código, rodar `graphify update .` quando possível.
6. Depois de mudanças relevantes em documentação, schema ou fluxos descritos, considerar uma reconstrução completa com `$graphify .`.

Não usar o Graphify como única fonte de verdade: confirmar a conclusão lendo os arquivos citados pelo grafo antes de editar. Se o health check do grafo indicar arestas pendentes ou colapsadas, tratar o resultado como guia de navegação, não como prova definitiva.

## Fora do MVP

Não implementar ainda:

- pagamento real
- WhatsApp API
- assinatura digital
- geração avançada de PDF
- IA para sugerir preço
- aplicativo mobile
- multiempresa complexo
- marketplace

## Estilo de código

- Código simples e legível
- Componentes pequenos
- Server actions quando fizer sentido
- Validação com Zod quando houver formulário
- Prisma para acesso ao banco
- Evitar abstrações desnecessárias
- Evitar dependências demais
- Manter tipagem forte
- Priorizar MVP funcional

## Antes de alterar arquivos

Sempre responder:

- quais arquivos serão alterados
- por que serão alterados
- qual etapa do MVP está sendo implementada

## Após alterar arquivos

Sempre responder:

- o que foi feito
- como testar
- comandos executados
- próximos passos
