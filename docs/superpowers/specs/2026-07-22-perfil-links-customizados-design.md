# Design — Links customizados no perfil

Data: 2026-07-22

## Objetivo

Permitir que o dono do negócio adicione **links livres** (rótulo + URL) no
perfil, além das redes sociais fixas (Instagram, Facebook, TikTok). Casos de
uso: site próprio, cardápio, WhatsApp, catálogo, YouTube, ou qualquer outra
página. Os links aparecem na vitrine pública.

Recurso de **identidade**: disponível em **todos os planos** (FREE e PRO),
com teto de **5 links**, coerente com a decisão "identidade é FREE"
(ver `docs/PROJECT_OVERVIEW.md`).

## Modelo de dados

Nova coluna em `ProviderProfile`:

```prisma
links Json?
```

Guarda um array ordenado de objetos `{ label, url }`. Exemplo:

```json
[
  { "label": "Meu site", "url": "https://exemplo.com" },
  { "label": "Cardápio", "url": "https://exemplo.com/cardapio" }
]
```

- **Por que JSON e não uma tabela `ProviderLink`:** a lista é pequena (≤5),
  sempre lida e gravada por inteiro junto do resto do perfil, e já há
  precedente no schema (`businessHours` é `Json`). Uma tabela relacional
  (migration + joins + ordenação explícita) seria overkill. Alternativa
  registrada e rejeitada.
- Migration Prisma adiciona a coluna nullable; perfis existentes ficam com
  `null` (equivalente a lista vazia).

## Helper `lib/profile-links.ts`

Módulo puro e testável, sem dependência de request/Prisma.

```ts
export type ProfileLink = { label: string; url: string };

export const MAX_PROFILE_LINKS = 5;
export const MAX_LINK_LABEL_LENGTH = 40;

// Sanitiza uma lista crua (vinda do formulário) para persistência.
export function sanitizeProfileLinks(
  raw: Array<{ label: string; url: string }>
): { links: ProfileLink[]; errors: string[] };

// Normaliza uma URL: prefixa https:// se não houver esquema; valida com
// new URL(); aceita SOMENTE http/https. Retorna a URL normalizada ou null.
export function normalizeLinkUrl(value: string): string | null;

// Lê a coluna Json (unknown) do banco para ProfileLink[] de forma defensiva.
export function parseProfileLinks(value: unknown): ProfileLink[];
```

Regras de `sanitizeProfileLinks`:

1. Faz `trim` de `label` e `url`.
2. Descarta linhas **totalmente vazias** (label e url vazios).
3. `label` obrigatório quando a linha tem url (e vice-versa); erro por linha.
4. `label` máx. `MAX_LINK_LABEL_LENGTH` (40) caracteres.
5. `url` passa por `normalizeLinkUrl`; se retornar `null`, erro na linha.
6. Após validar, **corta em `MAX_PROFILE_LINKS` (5)** — o servidor não confia
   no cliente.

Regras de `normalizeLinkUrl` (segurança):

- Se não começa com `http://` ou `https://`, prefixa `https://`.
- Valida com `new URL()`; se lançar, retorna `null`.
- Aceita apenas `protocol` `http:` ou `https:` — **rejeita** `javascript:`,
  `data:`, `mailto:`, `tel:`, etc. (proteção contra XSS na vitrine pública).

## Formulário do perfil (`/dashboard/perfil`)

Nova subseção **"Outros links"** dentro de `PresenceSection`, logo abaixo das
redes sociais (mantém todos os links agrupados no mesmo lugar; a aba é
"Contato").

- Lista dinâmica de linhas `rótulo + URL`, seguindo o padrão de
  `components/proposals/ProposalItemsFields.tsx` (estado local com `useState`,
  "Adicionar link" e "Remover" por linha), reaproveitando o primitivo
  `components/ui/Field.tsx`.
- Teto de 5: o botão "Adicionar link" some/desabilita ao chegar em 5.
- Campos enviados como `linkLabel` e `linkUrl` (repetidos, lidos com
  `formData.getAll`, casados por índice — igual aos itens de proposta).
- Client-side é conveniência; a validação real é no servidor via helper.

### Server action `saveProviderProfile` (`lib/actions/provider-profile.ts`)

- Lê `linkLabel[]`/`linkUrl[]`, monta a lista crua e chama
  `sanitizeProfileLinks`.
- Se houver erro de link, retorna estado de erro do perfil (mesma UX dos
  demais campos), sem persistir.
- Persiste `links` (JSON) junto do restante do perfil.
- Adiciona `links: ProfileLink[]` a `ProviderProfileFormValues` para
  repopular o formulário em caso de erro.

## Vitrine pública (`/u/[slug]`)

- `select` do perfil passa a incluir `links: true`; parse com
  `parseProfileLinks`.
- Abaixo dos ícones de redes sociais, renderiza uma lista **"Links"** com os
  links customizados como botões/links de **texto** (têm rótulo próprio,
  diferente dos ícones das redes).
- Cada `<a>`: `target="_blank"` + `rel="noopener noreferrer nofollow"`.
- Se a lista estiver vazia, a seção não aparece.

## Testes

Unitários de `lib/profile-links.ts`:

- `normalizeLinkUrl`: prefixa `https://` quando falta esquema; mantém
  `http://`/`https://` válidas; rejeita `javascript:`, `data:`, `mailto:`,
  string inválida.
- `sanitizeProfileLinks`: descarta linhas vazias; exige label quando há url;
  aplica limite de 40 chars no label; corta em 5; propaga erros por linha.
- `parseProfileLinks`: lê JSON válido; retorna `[]` para `null`/formato
  inesperado (defensivo).

## Documentação a atualizar na implementação

- `docs/PROJECT_OVERVIEW.md`: entidade `ProviderProfile` ganha `links`;
  decisão de produto (links customizados FREE, teto 5).
- `docs/DATABASE.md`: coluna `links` (Json) em `ProviderProfile`.
- `docs/ROADMAP.md`: item em "Concluído".
- `docs/AI_HANDOFF.md`: menção ao novo campo/limite, se listar campos do perfil.

## Riscos e decisões registradas

- **Segurança de URL arbitrária:** mitigada por whitelist de esquema
  (`http`/`https`) no helper e `rel="noopener noreferrer nofollow"` na
  vitrine. Sem isso, `javascript:` seria XSS.
- **Teto de 5 no servidor:** evita spam/SEO e vitrine poluída mesmo se o
  cliente for burlado.
- **JSON vs tabela:** JSON escolhido pela simplicidade; se no futuro os links
  precisarem de ordenação arrastável complexa, cliques/analytics por link, ou
  relações, reavaliar migração para tabela.
- **Sem ícones automáticos:** links livres têm rótulo textual; não tentamos
  detectar a plataforma para exibir ícone (fora do escopo; as redes fixas
  seguem com seus ícones).
