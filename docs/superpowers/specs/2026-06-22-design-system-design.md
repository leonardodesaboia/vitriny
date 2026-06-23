# Design System — OrçaFácil
**Data:** 2026-06-22  
**Estética:** Tropical Paper  
**Tema:** Claro  

---

## 1. Visão geral

Design system completo para elevar o OrçaFácil de funcional a memorável. Estética "Tropical Paper": creme quente, verde-floresta profundo, acento âmbar, tipografia Fraunces + Plus Jakarta Sans. Framer Motion para animações com spring physics.

Objetivo: criar padrões visuais consistentes antes de adicionar features, para que cada nova tela já nasça com a identidade estabelecida.

---

## 2. Tokens de cor

```css
--paper:       #F5F0E8   /* fundo base */
--paper-soft:  #EDE8DE   /* cards, seções alternadas */
--white:       #FEFDFB   /* cards elevados, inputs */
--ink:         #1C1917   /* texto principal */
--ink-muted:   #78716C   /* labels, texto secundário */
--leaf:        #1B5E3B   /* cor primária, botões */
--leaf-hover:  #2D7A52   /* hover do primário */
--mint:        #D4EBD9   /* fundos de badge, tints */
--amber:       #C97D3F   /* acento quente, destaques */
--amber-soft:  #F5E6D3   /* fundos com acento */
```

Tailwind: configurar via `tailwind.config.ts` em `extend.colors`.

---

## 3. Tipografia

| Papel | Família | Tamanho | Peso |
|---|---|---|---|
| Display | Fraunces | 60–72px | 700, optical-size 144 |
| H1 | Fraunces | 40px | 600 |
| H2 | Fraunces | 28px | 600 |
| H3 | Plus Jakarta Sans | 18px | 700 |
| Body | Plus Jakarta Sans | 15px | 400 |
| Label | Plus Jakarta Sans | 12px | 600, uppercase, tracking-wide |
| Mono | JetBrains Mono | 14px | 400 |

Carregamento: `next/font/google` com `display: swap` e subsets `latin`.

---

## 4. Componentes

### Botões
| Variante | Estilo |
|---|---|
| Primary | `bg-leaf` texto branco, hover `bg-leaf-hover`, tap `scale-0.97` |
| Secondary | border leaf, texto leaf, hover `bg-mint` |
| Ghost | sem borda, texto ink-muted, hover texto leaf |
| Danger | border terracota suave, texto vermelho |

Todos: `focus-visible` ring âmbar 2px, offset 2px.

### Cards
- Base: `bg-white`, border `paper-soft`, shadow layered (`1px + 4px`)
- Hover: shadow mais profunda + `translateY(-2px)` spring
- Hero cards: grain overlay via `::before` SVG noise a 3% opacidade

### Badges de status
| Status | Estilo |
|---|---|
| NEW | bg-amber-soft, texto amber, ponto pulsante |
| REVIEWING | bg-blue-50, texto blue-700 |
| PROPOSAL_SENT | bg-mint, texto leaf, ícone seta |
| CLOSED | bg-paper-soft, texto ink-muted |
| APPROVED | bg-leaf, texto white, ícone check |
| REJECTED | bg-red-50, texto red-700 |

### Sidebar do dashboard
- 64px collapsed (só ícones) / 220px expanded (ícones + labels)
- Animação spring no toggle
- Persistência do estado em `localStorage`

---

## 5. Animações (Framer Motion)

| Momento | Efeito |
|---|---|
| Entrada de página | `fade-up` staggerado, delay 0.1s/elemento, duration 0.5s |
| Cards no scroll | `useInView` threshold 0.2, `fade-up` + spring |
| Contadores dashboard | 0 → valor, `easeOut`, 1.2s |
| Hover em linha de pedido | borda leaf `scaleX` da esquerda |
| Botão submit | spinner inline com `AnimatePresence` |
| Toast | slide-in direita, auto-dismiss com barra de progresso |
| Add/remove item proposta | `AnimatePresence` com `layout` prop |

---

## 6. Layout página a página

### `/` Landing
- Hero assimétrico: título Fraunces 72px + card mockup `rotate-1`
- Grain overlay no header
- Seção "como funciona" com numerais editoriais grandes em fundo
- CTA âmbar na segunda dobra

### `/dashboard`
- Sidebar fixa (ver acima)
- Row de 4 cards com contadores animados
- Feed de pedidos recentes com timeline lateral em leaf
- Numeral editorial `01` em fundo no card de boas-vindas

### `/dashboard/pedidos`
- Lista com badge de status + nome + data
- Hover: borda leaf com `scaleX`
- Tab-bar de filtro por status
- Empty state com ícone e CTA para copiar link público

### `/dashboard/propostas/nova`
- Formulário duas colunas: campos + preview ao vivo
- Itens dinâmicos com `AnimatePresence`
- Total em tempo real com Fraunces mono

### `/u/[slug]` Perfil público
- Fraunces Display no nome do negócio
- Grid de serviços com `useInView` stagger
- Sticky CTA mobile no bottom

### `/u/[slug]/orcamento` Formulário público
- Single-column, max-width 520px
- Steps visuais com progress bar âmbar
- Float label nos campos

### `/proposta/[publicToken]`
- Layout de documento premium
- Tabela de itens com linhas alternadas
- Total em Fraunces mono grande
- `AnimatePresence` nos botões Aprovar/Recusar → mensagem confirmação

### `/login`
- Split: padrão geométrico folhas (CSS puro) | form
- Grain + gradiente radial leaf→mint no lado esquerdo

---

## 7. Dependências a adicionar

```bash
npm install framer-motion
```

Fontes via `next/font/google`: `Fraunces`, `Plus_Jakarta_Sans`, `JetBrains_Mono`.

---

## 8. Arquivos a criar/alterar

| Arquivo | Ação |
|---|---|
| `tailwind.config.ts` | Adicionar tokens de cor e fonte |
| `app/globals.css` | CSS variables, grain texture, base styles |
| `app/layout.tsx` | Carregar fontes com next/font |
| `components/ui/Button.tsx` | Novo componente Button unificado |
| `components/ui/Card.tsx` | Novo componente Card com variantes |
| `components/ui/Badge.tsx` | Badge de status com mapa de cores |
| `components/ui/AnimatedCounter.tsx` | Contador animado para dashboard |
| `components/ui/Toast.tsx` | Sistema de toast |
| `components/layout/Sidebar.tsx` | Sidebar collapsible do dashboard |
| `components/layout/SiteHeader.tsx` | Atualizar com nova identidade |
| `components/layout/SiteFooter.tsx` | Atualizar com nova identidade |
| `app/page.tsx` | Aplicar novo design na landing |

---

## 9. Sequência de implementação (Approach A)

1. **Fundações** — tailwind tokens, globals.css, fontes, componentes ui/ base
2. **Landing page** — novo design completo
3. **Dashboard** — sidebar + métricas com contadores
4. **Páginas de pedido** — lista + detalhe
5. **Proposta pública** — layout documento premium
6. **Perfil público** — hero + grid de serviços
7. **Formulário público** — float labels + steps
