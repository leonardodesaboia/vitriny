# AI Handoff

## Resumo rápido

OrçaFácil é um MVP de microSaaS para prestadores receberem pedidos de orçamento e enviarem propostas por link.

O MVP principal está implementado.

## Estado atual

Funciona hoje:

- login GitHub;
- dashboard protegido;
- perfil do prestador;
- serviços;
- página pública `/u/[slug]`;
- pedido público;
- painel de pedidos;
- criação de proposta;
- página pública `/proposta/[publicToken]`;
- aprovação/recusa.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth v5 beta
- Zod

## Comandos principais

```bash
npm run dev
npm run lint
npm run build
npx prisma validate
npm run prisma:migrate
npm run prisma:generate
npm run prisma:studio
```

## Regras de trabalho

1. Planejar antes de alterar arquivos.
2. Listar arquivos que serão criados/alterados.
3. Implementar uma etapa pequena por vez.
4. Não alterar schema Prisma sem necessidade real.
5. Não alterar Auth.js sem necessidade real.
6. Rodar `npm run lint`, `npm run build` e `npx prisma validate`.
7. Atualizar documentação quando mudar fluxo, rota, schema ou setup.

## Como escolher a próxima tarefa

Priorize:

1. Teste manual completo do MVP.
2. Correção de bugs encontrados no fluxo.
3. Deploy/staging.
4. Testes automatizados.
5. Melhorias pequenas validadas.

## Ordem recomendada

1. Validar fluxo em staging.
2. Adicionar testes E2E do caminho principal.
3. Melhorar relação `QuoteRequest` -> `Service`.
4. Melhorar formulário de proposta.
5. Adicionar notificações.

## Padrões de código existentes

- Server Components para páginas.
- Server Actions em `lib/actions/`.
- Zod em `lib/validations/`.
- Prisma direto no servidor.
- Componentes pequenos por domínio.
- Tailwind para UI.

## Restrições importantes

- Não usar Supabase.
- Não implementar Pix, pagamento, WhatsApp API, PDF avançado ou IA sem validação.
- Não expor IDs internos em links públicos.
- Usar `publicToken` para proposta pública.
- Usar `slug` para perfil público.
- Cliente público não precisa de login.

## Arquivos para ler primeiro

1. `AGENTS.md`
2. `README.md`
3. `docs/PROJECT_OVERVIEW.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATABASE.md`
6. `prisma/schema.prisma`
7. `auth.ts`
8. `lib/actions/`

## Cuidados para não quebrar

- Ownership: sempre filtrar dados autenticados pelo `ProviderProfile` do usuário logado.
- Proposta pública: sempre buscar por `publicToken`.
- Perfil público: só mostrar `isPublished=true`.
- Serviços públicos: só mostrar `isActive=true`.
- Proposal response: bloquear se já aprovada/recusada ou expirada.
- Dinheiro: manter `Decimal`, não usar `Float`.

## Validação obrigatória após mudanças

```bash
npm run lint
npm run build
npx prisma validate
```

Se mudar banco:

```bash
npm run prisma:migrate -- --name nome-da-migration
npm run prisma:generate
```

Em produção, usar:

```bash
npx prisma migrate deploy
```

## Documentação

Atualizar documentação quando mudar:

- rotas;
- schema;
- Auth;
- variáveis de ambiente;
- comandos;
- fluxo do MVP;
- decisões de produto.
