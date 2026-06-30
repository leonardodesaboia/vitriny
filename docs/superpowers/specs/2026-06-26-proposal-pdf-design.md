# Design: Geração de PDF de Proposta

**Data:** 2026-06-26
**Status:** Aprovado

## Objetivo

Permitir que o prestador baixe um PDF da proposta a partir do painel de pedidos, disponível quando a proposta estiver com status `APPROVED` ou `REJECTED`.

## Escopo

- Geração server-side com `@react-pdf/renderer`
- Rota autenticada `GET /api/proposals/[id]/pdf`
- Botão "Baixar PDF" no `QuoteRequestCard` do dashboard
- Sem alterações na página pública da proposta (`/proposta/[publicToken]`)

## Fora do escopo

- QR Code Pix no PDF (dados do Pix aparecem apenas como valor, sem código de pagamento)
- Página de preview do PDF antes do download
- Download disponível para o cliente na página pública

---

## Arquitetura

### Fluxo

```
Prestador clica "Baixar PDF"
  → GET /api/proposals/[id]/pdf
  → auth() verifica sessão
  → busca proposta por id, filtra por providerId do prestador logado
  → monta ProposalPdf com @react-pdf/renderer
  → retorna stream PDF com Content-Disposition: attachment
```

### Arquivos novos

| Arquivo                                | Responsabilidade                                                |
| -------------------------------------- | --------------------------------------------------------------- |
| `app/api/proposals/[id]/pdf/route.ts`  | Route handler: autenticação, ownership, geração e stream do PDF |
| `components/proposals/ProposalPdf.tsx` | Componente React PDF com layout e design tokens                 |

### Arquivo alterado

| Arquivo                                         | Alteração                                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `components/quote-request/QuoteRequestCard.tsx` | Adiciona `<a href="/api/proposals/[id]/pdf" download>` na seção de proposta quando status é `APPROVED` ou `REJECTED` |

---

## Segurança

- `auth()` é chamado na rota antes de qualquer query ao banco
- A proposta é buscada filtrando `proposal.provider.userId === session.user.id` — mesmo padrão de ownership das Server Actions
- O `[id]` na URL é o ID interno da proposta (nunca exposto em links públicos; links públicos usam `publicToken`)
- Sessão inválida ou proposta de outro prestador retorna 401 / 404

---

## Rota de API

**`GET /api/proposals/[id]/pdf`**

### Lógica

1. Chama `auth()` — se sem sessão, retorna `401`
2. Busca `ProviderProfile` pelo `session.user.id`
3. Busca `Proposal` por `id` com `providerId === profile.id` — se não encontrar, retorna `404`
4. Se `status !== "APPROVED" && status !== "REJECTED"`, retorna `400`
5. Gera PDF com `renderToStream(<ProposalPdf proposal={...} />)`
6. Retorna `Response` com headers:
   - `Content-Type: application/pdf`
   - `Content-Disposition: attachment; filename="proposta-[publicToken].pdf"`

### Query Prisma

```ts
prisma.proposal.findFirst({
  where: { id, provider: { userId: session.user.id } },
  include: {
    provider: { select: { businessName, email, phone, city, state } },
    quoteRequest: {
      include: { service: { select: { name } } },
    },
    items: { orderBy: { createdAt: "asc" } },
    statusHistory: { orderBy: { createdAt: "asc" } },
  },
});
```

---

## Componente PDF (`ProposalPdf`)

Usa `@react-pdf/renderer` com as primitivas `Document`, `Page`, `View`, `Text`, `StyleSheet`.

### Design tokens aplicados

| Token Tailwind | Valor hex | Uso no PDF                                   |
| -------------- | --------- | -------------------------------------------- |
| `leaf`         | `#1B5E3B` | Cabeçalho, títulos de seção, total           |
| `paper`        | `#F5F0E8` | Fundo de cards e linhas alternadas da tabela |
| `paper-soft`   | `#EDE8DE` | Bordas, header da tabela de itens            |
| `ink`          | `#1C1917` | Texto principal                              |
| `ink-muted`    | `#78716C` | Labels, subtítulos                           |
| `amber`        | `#C97D3F` | Badge "Entrada"                              |

### Fontes

- Títulos: Fraunces (registrada via `Font.register` com o arquivo do projeto ou Google Fonts)
- Corpo: Helvetica (built-in do PDF) como fallback seguro para produção

### Estrutura de seções

```
Document > Page (A4, padding 40px)
  ├── Header (fundo #1B5E3B)
  │     ├── "ORÇAFÁCIL · PROPOSTA COMERCIAL" (label branco, uppercase)
  │     ├── Título da proposta (Fraunces, bold, branco)
  │     ├── Serviço (se houver)
  │     └── Status badge (cor por status)
  ├── Grid Prestador / Cliente (2 colunas)
  │     ├── Prestador: businessName, email, phone, city+state
  │     └── Cliente: customerName, customerEmail, customerPhone
  ├── Agendamento (somente se desiredDate || desiredTime || location)
  │     └── Data · Horário/período · Local (3 colunas)
  ├── Itens da proposta
  │     ├── Header: Descrição | Qtd | Unit. | Total
  │     └── Linhas alternadas (branco / paper)
  ├── Rodapé financeiro
  │     ├── Válido até [data] (se houver)
  │     └── Total em destaque (Fraunces, grande)
  ├── Entrada Pix (somente se depositAmount > 0)
  │     └── Valor + status do pagamento
  ├── Histórico de status
  │     └── Lista cronológica: status, ator, data
  └── Rodapé do documento
        └── "Gerado via Vitriny em [data]"
```

### Status badges no PDF

| Status     | Cor de fundo     | Cor do texto     |
| ---------- | ---------------- | ---------------- |
| `APPROVED` | `#D4EBD9` (mint) | `#1B5E3B` (leaf) |
| `REJECTED` | `#FEF2F2`        | `#B91C1C`        |

---

## Botão no QuoteRequestCard

### Condição de exibição

```ts
quoteRequest.proposal?.status === "APPROVED" ||
  quoteRequest.proposal?.status === "REJECTED";
```

### Markup

```tsx
<a
  href={`/api/proposals/${quoteRequest.proposal.id}/pdf`}
  download
  className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-stone-300"
>
  ↓ Baixar PDF
</a>
```

Fica ao lado do link "Ver proposta ↗" em desktop; empilhado abaixo em mobile (flex-col no mobile, flex-row no sm:).

---

## Dependência nova

```bash
npm install @react-pdf/renderer
```

Nota: `@react-pdf/renderer` já inclui tipos TypeScript no próprio pacote — nenhuma dependência `@types` adicional necessária.

---

## Validação após implementação

```bash
npm run lint
npm run build
npx prisma validate
npm test
```

- Testar download com proposta `APPROVED` — deve gerar PDF válido
- Testar download com proposta `REJECTED` — deve gerar PDF válido
- Testar acesso não autenticado à rota — deve retornar 401
- Testar acesso à proposta de outro prestador — deve retornar 404
- Testar proposta com status `SENT` — deve retornar 400
