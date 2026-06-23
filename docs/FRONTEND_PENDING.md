# Pendências de Frontend

Este documento registra alterações de front que devem ser feitas depois, quando não houver conflito com a frente visual em andamento.

## 1. Usar relação real entre pedido e serviço

Status: implementado no painel de pedidos, com fallback legado para pedidos antigos.

O painel já busca `quoteRequest.service` e prioriza `quoteRequest.service?.name`. O fallback legado por prefixo em `description` foi mantido para pedidos antigos.

### Contexto

O banco agora possui relação opcional entre `QuoteRequest` e `Service`:

- `QuoteRequest.serviceId`
- `QuoteRequest.service`
- `Service.quoteRequests`

Pedidos novos já salvam `serviceId` em `lib/actions/quote-requests.ts` e mantêm `description` sem prefixo técnico.

Compatibilidade mantida:

- pedidos antigos ainda podem ter o serviço escolhido prefixado em `QuoteRequest.description`;
- `components/quote-request/QuoteRequestList.tsx` ainda usa esse prefixo apenas quando `quoteRequest.service` não existe.

### Arquivos alterados

- `app/(dashboard)/dashboard/pedidos/page.tsx`
- `components/quote-request/QuoteRequestList.tsx`
- `lib/actions/quote-requests.ts`

### Alteração em `app/(dashboard)/dashboard/pedidos/page.tsx`

Na query de `providerProfile.findUnique`, dentro de `quoteRequests.include`, incluir o relacionamento `service`:

```ts
quoteRequests: {
  orderBy: {
    createdAt: "desc"
  },
  include: {
    service: {
      select: {
        id: true,
        name: true
      }
    },
    proposal: {
      select: {
        publicToken: true
      }
    }
  }
}
```

Observação: a prop `services={profile.services}` ainda existe apenas para traduzir pedidos antigos sem `serviceId` preenchido.

### Alteração em `components/quote-request/QuoteRequestList.tsx`

Atualizar o tipo `QuoteRequestWithProposal` para incluir `service`:

```ts
type QuoteRequestWithProposal = QuoteRequest & {
  service: {
    id: string;
    name: string;
  } | null;
  proposal: {
    publicToken: string;
  } | null;
};
```

Pendente para remoção completa do legado:

- `serviceNamesById`;
- função `splitServiceFromDescription`;
- parsing do prefixo `"Serviço selecionado: "`.

Usar diretamente:

```ts
const serviceLabel = quoteRequest.service?.name ?? null;
const cleanDescription = quoteRequest.description;
```

### Compatibilidade com pedidos antigos

Pedidos criados antes desta mudança podem ter `serviceId = null` e ainda conter o prefixo legado na descrição.

Há duas opções:

1. Manter fallback temporário de parsing somente para pedidos antigos.
2. Criar uma migration/backfill manual para preencher `serviceId` a partir do prefixo legado e depois remover o parsing.

Recomendação: usar fallback temporário no front, porque é menos arriscado e não exige interpretar dados antigos no banco automaticamente.

### Gravação em `lib/actions/quote-requests.ts`

Pedidos novos gravam somente a descrição enviada pelo cliente:

```ts
description: parsed.data.description
```

### Critérios de aceite

- Pedido novo com serviço selecionado salva `serviceId`.
- Painel de pedidos mostra o nome do serviço a partir de `quoteRequest.service?.name`.
- Pedido sem serviço continua mostrando "Não informado".
- Pedido antigo continua legível.
- A descrição exibida não mostra mais o prefixo técnico para pedidos novos.
- Nenhuma rota pública passa a expor ID interno como link público.

### Verificações recomendadas

```bash
npm.cmd run lint
npm.cmd run build
npx.cmd prisma validate
```

## 2. Exibir historico de status do pedido

Status: implementado no painel de pedidos.

O painel busca `statusHistory` em cada pedido e exibe uma seção discreta de histórico por card.

### Contexto

O backend agora registra mudancas de status em `QuoteRequestStatusHistory`.

Registros sao criados quando:

- cliente envia um pedido publico (`toStatus: NEW`, `actor: CUSTOMER`);
- prestador altera status manualmente em `/dashboard/pedidos` (`actor: PROVIDER`);
- prestador cria uma proposta (`toStatus: PROPOSAL_SENT`, `actor: PROVIDER`);
- cliente aprova ou recusa proposta publica (`toStatus: CLOSED`, `actor: CUSTOMER`).

### Arquivos provaveis a alterar depois

- `app/(dashboard)/dashboard/pedidos/page.tsx`
- `components/quote-request/QuoteRequestList.tsx`

Se existir uma pagina de detalhe do pedido no futuro:

- `app/(dashboard)/dashboard/pedidos/[id]/page.tsx`

### Alteracao em query

Incluir `statusHistory` nos pedidos:

```ts
statusHistory: {
  orderBy: {
    createdAt: "desc"
  },
  select: {
    id: true,
    fromStatus: true,
    toStatus: true,
    actor: true,
    note: true,
    createdAt: true
  }
}
```

### Exibicao recomendada

Para evitar poluir a lista principal, a melhor opcao e exibir o historico em uma futura pagina de detalhe do pedido.

Se for exibido na lista atual, usar uma secao discreta por pedido, sem alterar o fluxo principal de acoes.

### Labels sugeridos

Status:

- `NEW`: `Novo`
- `REVIEWING`: `Em analise`
- `PROPOSAL_SENT`: `Proposta enviada`
- `CLOSED`: `Fechado`

Actor:

- `CUSTOMER`: `Cliente`
- `PROVIDER`: `Prestador`
- `SYSTEM`: `Sistema`

### Criterios de aceite

- Pedido novo mostra registro inicial `Novo`.
- Alteracao manual de status adiciona item no historico.
- Criacao de proposta adiciona item `Proposta enviada`.
- Aprovacao/recusa publica adiciona item `Fechado`.
- Historico aparece em ordem cronologica clara.
- Usuario so ve historico dos proprios pedidos.

## 3. Exibir historico de status da proposta

Status: implementado na pagina publica da proposta.

A pagina `/proposta/[publicToken]` busca `statusHistory` e exibe o historico da proposta sem expor IDs internos.

### Contexto

O backend agora registra mudancas de status em `ProposalStatusHistory`.

Registros sao criados quando:

- prestador cria e envia uma proposta (`toStatus: SENT`, `actor: PROVIDER`);
- cliente aprova a proposta publica (`toStatus: APPROVED`, `actor: CUSTOMER`);
- cliente recusa a proposta publica (`toStatus: REJECTED`, `actor: CUSTOMER`).

### Arquivos provaveis a alterar depois

- `app/proposta/[publicToken]/page.tsx`

Se existir uma area autenticada de detalhe da proposta no futuro:

- `app/(dashboard)/dashboard/propostas/[id]/page.tsx`

### Alteracao em query

Incluir `statusHistory` na busca da proposta:

```ts
statusHistory: {
  orderBy: {
    createdAt: "desc"
  },
  select: {
    id: true,
    fromStatus: true,
    toStatus: true,
    actor: true,
    note: true,
    createdAt: true
  }
}
```

### Exibicao recomendada

Na pagina publica da proposta, mostrar o historico apenas se isso fizer sentido para o cliente. Para uso operacional, a melhor exibicao e em uma futura pagina autenticada de detalhe da proposta.

### Labels sugeridos

Status:

- `DRAFT`: `Rascunho`
- `SENT`: `Enviada`
- `APPROVED`: `Aprovada`
- `REJECTED`: `Recusada`
- `EXPIRED`: `Expirada`

Actor:

- `CUSTOMER`: `Cliente`
- `PROVIDER`: `Prestador`
- `SYSTEM`: `Sistema`

### Criterios de aceite

- Proposta criada mostra registro inicial `Enviada`.
- Aprovacao publica adiciona item `Aprovada`.
- Recusa publica adiciona item `Recusada`.
- Historico aparece em ordem cronologica clara quando exibido.
- Pagina publica continua buscando proposta por `publicToken`, nunca por ID interno.

## 4. Gerenciar notas internas do pedido

Status: implementado no painel de pedidos.

O painel busca `internalNotes`, exibe notas privadas por pedido e oferece forms autenticados para criar e excluir notas.

### Contexto

O backend agora possui `QuoteRequestInternalNote` para observacoes privadas do prestador sobre um pedido.

Actions disponiveis:

- `createQuoteRequestNote` em `lib/actions/quote-request-notes.ts`
- `deleteQuoteRequestNote` em `lib/actions/quote-request-notes.ts`

Notas internas:

- exigem usuario autenticado;
- validam ownership pelo `ProviderProfile` do usuario logado;
- nao devem aparecer em rotas publicas;
- sao removidas em cascata se o pedido for removido.

### Arquivos provaveis a alterar depois

- `app/(dashboard)/dashboard/pedidos/page.tsx`
- `components/quote-request/QuoteRequestList.tsx`

Se existir uma pagina de detalhe do pedido no futuro:

- `app/(dashboard)/dashboard/pedidos/[id]/page.tsx`

### Alteracao em query

Incluir `internalNotes` nos pedidos autenticados:

```ts
internalNotes: {
  orderBy: {
    createdAt: "desc"
  },
  select: {
    id: true,
    content: true,
    createdAt: true,
    author: {
      select: {
        name: true,
        email: true
      }
    }
  }
}
```

### Formulario

Criar um form autenticado com:

- hidden `requestId`;
- textarea/input `content`;
- action `createQuoteRequestNote`.

Para exclusao:

- hidden `noteId`;
- action `deleteQuoteRequestNote`.

### Exibicao recomendada

A melhor experiencia e exibir notas internas em uma futura pagina de detalhe do pedido, nao na lista principal. Se forem exibidas na lista, manter uma area discreta e claramente privada.

### Criterios de aceite

- Prestador consegue criar nota em pedido proprio.
- Prestador consegue excluir nota de pedido proprio.
- Prestador nao consegue criar/excluir nota de pedido de outro prestador.
- Nota interna nao aparece em `/u/[slug]`, `/u/[slug]/orcamento` nem `/proposta/[publicToken]`.
- Conteudo vazio ou muito longo e rejeitado pela validacao.

## 5. Gerenciar templates de proposta

Status: implementado.

A tela autenticada permite criar, editar e excluir templates. O formulario de criacao de proposta aceita `templateId` na URL e preenche titulo, descricao e os campos atuais de itens a partir do modelo selecionado.

### Contexto

O backend possui templates reutilizaveis de proposta:

- `ProposalTemplate`
- `ProposalTemplateItem`

Actions disponiveis:

- `createProposalTemplate` em `lib/actions/proposal-templates.ts`
- `updateProposalTemplate` em `lib/actions/proposal-templates.ts`
- `deleteProposalTemplate` em `lib/actions/proposal-templates.ts`

Templates:

- exigem usuario autenticado;
- pertencem ao `ProviderProfile`;
- validam ownership pelo prestador logado;
- nao aparecem em rotas publicas.

### Arquivos provaveis a alterar depois

Para gerenciamento:

- `app/(dashboard)/dashboard/propostas/templates/page.tsx`
- novo componente em `components/proposals/`

Para uso na criacao de proposta:

- `app/(dashboard)/dashboard/propostas/nova/page.tsx`
- `components/proposals/ProposalForm.tsx`

### Alteracao em query

Em tela autenticada, buscar templates do prestador:

```ts
proposalTemplates: {
  orderBy: {
    createdAt: "desc"
  },
  include: {
    items: {
      orderBy: {
        createdAt: "asc"
      }
    }
  }
}
```

### Uso recomendado no formulario de proposta

O template deve preencher campos do formulario, copiando:

- `title`;
- `description`;
- `items.description`;
- `items.quantity`;
- `items.unitPrice`.

O uso do template nao deve criar relacao obrigatoria entre `Proposal` e `ProposalTemplate`; a proposta deve continuar independente depois de criada.

### Campos de formulario esperados pelas actions

- `templateId` somente para atualizar/excluir;
- `name`;
- `title`;
- `description`;
- `itemDescription[]`;
- `itemQuantity[]`;
- `itemUnitPrice[]`.

### Criterios de aceite

- Prestador consegue criar template com pelo menos um item.
- Prestador consegue editar template proprio.
- Prestador consegue excluir template proprio.
- Prestador nao consegue editar/excluir template de outro prestador.
- Template pode ser usado para preencher uma proposta sem alterar o fluxo publico da proposta.
- Valores monetarios continuam usando `Decimal`, nunca `Float`.

## 6. Editor dinamico de itens da proposta

Status: implementado.

O formulario de proposta usa `ProposalItemsFields` para adicionar e remover linhas sem depender de uma quantidade predefinida.

### Contexto

O formulario de proposta recebe pre-preenchimento de templates e renderiza esses itens como linhas editaveis no editor dinamico.

### Arquivos alterados

- `components/proposals/ProposalForm.tsx`
- `components/proposals/ProposalItemsFields.tsx`

### Criterios de aceite

- Prestador consegue adicionar mais itens alem do limite anterior.
- Prestador consegue remover linhas de item antes de enviar.
- Template continua preenchendo os campos iniciais da proposta.
- A precificacao continua usando `Decimal` e mantendo o total calculado no servidor.
