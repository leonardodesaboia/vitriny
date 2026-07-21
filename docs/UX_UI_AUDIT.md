# Auditoria de UX/UI — Vitriny (moldura mobile-first)

> Data: 2026-07-21 · Branch: `refactor/services-to-items`

> **O app é mobile-first — e esta auditoria adota essa moldura.** Evidência objetiva: **207 classes de breakpoint scale-up (`sm:`/`md:`/`lg:`) contra 0 desktop-first (`max-*`)**, breakpoints padrão do Tailwind (mobile como base), navegação em **drawer no mobile** que vira sidebar no desktop (`md:hidden` no hambúrguer, `-translate-x-full`, `md:sticky`), e o produto central — a **vitrine pública compartilhada por link de WhatsApp** — é consumido quase sempre no celular, por um público (MEIs) que opera no telefone. Portanto o **baseline desta análise é 360px** e o desktop é o aprimoramento. O `/u/[slug]` mobile é tratado como a **tela-herói**.

> **Cobertura e método.** App real rodado (`localhost:3000`, Postgres ativo). **Screenshots ao vivo:** públicas em **360 / 414 / 768** + desktop 1440; **dashboard e área autenticada ao vivo em 360 e 768** (login por credenciais com dados semeados: negócio "Ateliê Boa Vista", 2 itens, 1 pedido — depois removidos). Login social **não testável** (Google placeholder no `.env`, por decisão de dev). Contrastes calculados a partir dos tokens em `globals.css`. Screenshots em `/tmp/vitriny-audit/` e `/tmp/vitriny-audit/mf/`.

> **O que NÃO foi possível confirmar:** o overflow do card de pedido de altura fixa `h-32` com **muitos badges** (backlog §4) — com dados leves (1 badge) o card se comporta bem; reproduzir exigiria um pedido com proposta+Pix+entrada simultâneos. Monitor amplo (>1440) não avaliado.

---

## 1. Resumo executivo

**Avaliação geral.** O Vitriny é **genuinamente mobile-first e a experiência pública no celular é o ponto mais forte do produto**: o `/u/[slug]` a 360px é excelente (hierarquia clara, contatos com WhatsApp/Ligar lado a lado, cards de item com CTA por modo de venda, alvos de toque grandes) e o formulário público de orçamento no celular é limpo e bem adaptado. A identidade visual (verde/creme, Fraunces+Jakarta) é coesa. Porém, a **área autenticada não recebeu o mesmo cuidado mobile**: o **dashboard é uma maratona vertical de 7+ seções** no celular, o **filtro de pedidos corta opções a 360px**, o **formulário de perfil é um paredão de ~10 seções sem navegação nem salvar fixo**, e há **duplicações** (bloco de plano no billing; cards de navegação na dashboard). Somam-se lacunas transversais de **acessibilidade** (contraste, nav só-ícone sem rótulo, ausência de `aria-invalid`/`aria-live`), **design system** (o componente `Button` existe mas nunca é usado) e **estados de rota** (sem `loading.tsx`/`error.tsx`/`not-found.tsx`).

**Maturidade:** Experiência pública mobile ~8/10 · Experiência autenticada mobile ~5/10 · UI ~7/10 · Acessibilidade ~4/10 · Design System ~4/10.

**Principais pontos positivos.**
- `/u/[slug]` e `/u/[slug]/orcamento` no celular: excelentes (a tela-herói cumpre bem seu papel).
- Estados vazios reais e com bom microcopy ("Catálogo em preparação", "Nenhuma fatura encontrada").
- Alvos de toque de 44px (`min-h-11`) em botões/inputs — acerto mobile-first.
- Selects e teclados numéricos nativos (`inputMode="numeric"`) nos campos mascarados.
- Microcopy PT-BR claro; vocabulário adapta produto vs serviço.

**Principais problemas (na moldura mobile-first).**
1. **Dashboard autenticado é sobrecarregado no celular** (7+ seções + 3 cards que duplicam o menu) → dono iniciante se perde no scroll.
2. **Filtro de status em `/pedidos` faz overflow e corta "Fechado" a 360px.**
3. **Formulário de perfil** — paredão de ~10 seções sem seções/accordion nem botão salvar fixo no mobile.
4. **Acessibilidade abaixo de WCAG AA:** contraste `ink-muted` ~4.4:1; menu só-ícone sem nome acessível (afeta tablet 768 também); `aria-invalid`=0, `aria-live`=1.
5. **Sem estados de rota** (`loading`/`error`/`not-found`) e **404 padrão do Next em inglês**.

**Riscos:** abandono do dono iniciante na área autenticada mobile; exclusão de usuários com deficiência (WCAG); quebra de confiança em telas de erro/404.

**Cinco melhorias mais importantes.**
1. Enxugar o dashboard mobile (remover cards redundantes, priorizar "próxima ação").
2. Corrigir o filtro de `/pedidos` que corta a 360px (scroll horizontal com indicação, ou wrap).
3. Contraste global do `ink-muted` + labels; nome acessível no menu.
4. `not-found.tsx`/`error.tsx`/`loading.tsx` com a marca.
5. Adotar o `Button` DS (uma cor primária) e validação client-side nos formulários.

---

## 2. Inventário da aplicação

**Perfis:** Dono do negócio (autenticado); Cliente final (público, sem login); Admin (previsto, **não implementado**).

**Rotas públicas (ao vivo, 360/414/768/1440):** `/`, `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha/[token]`, `/verifique-seu-email`, `/verificar-email/[token]`, `/u/[slug]`, `/u/[slug]/orcamento`, `/u/[slug]/reserva/[requestId]`, `/u/[slug]/pagamento/[requestId]` (legado), `/proposta/[publicToken]`, `/termos`, `/privacidade`.

**Rotas autenticadas (ao vivo, 360/768):** `/dashboard`, `/dashboard/pedidos`, `/dashboard/servicos`, `/dashboard/perfil`, `/dashboard/billing`, `/dashboard/propostas/templates`. **Só por código:** `/dashboard/pedidos/[id]`, `/dashboard/propostas/nova`.

**Componentes principais:** `ui/` (Button — **não usado**, Card, DateInput, CurrencyInput, PhoneInput, ConfirmModal, CopyButton, AnimatedCounter, StatusBadge), `layout/Sidebar`, `dashboard/*`, `onboarding/*`, `billing/*`, `quote-request/*`, `proposals/*`, `provider-profile/*`, `public/OpenNowBadge`, `landing/*`.

**Incompleto/duplicado:** `LandingPainStrip` órfão; rota legada `/pagamento`; **cards de navegação no rodapé da dashboard** (duplicam o menu); **bloco "Plano atual" duplicado no billing**; Admin, `not-found/error/loading`, OG images ausentes.

---

## 3. Perfis e objetivos

**Dono (MEI, no celular).** Objetivo: publicar a vitrine e receber pedidos. Dificuldades reais no mobile: **dashboard longo demais**, **formulário de perfil paredão**, **menu só-ícone**. Fluxos 1,2,4,5,6,7.

**Cliente final (no celular, via WhatsApp).** Objetivo: pedir/pagar sem conta. Bem servido: vitrine e orçamento mobile são ótimos. Dificuldade: regra "e-mail ou telefone" só no servidor. Fluxos 3,5,6.

**Admin.** Não implementado.

---

## 4. Mapa dos principais fluxos

**A — Cadastro → primeira vitrine (dono, mobile).** `/cadastro` → verificação de e-mail → `/login` → `/dashboard` (checklist) → `/dashboard/perfil` → `/dashboard/servicos` → copiar link. *Obstáculos:* verificação externa; **dashboard denso** e **perfil paredão** no celular; sem `loading`. *Abandono provável:* verificação de e-mail e primeiro contato com o dashboard.

**B — Cliente envia pedido (mobile, herói).** `/u/[slug]` → CTA do item → `/u/[slug]/orcamento` → envia → sucesso (ou reserva Pix). *Bom no mobile*; *obstáculos:* validação "e-mail ou telefone" server-only; barra de progresso de 3 passos enganosa (não é multi-step).

**C — Proposta (dono → cliente).** `/pedidos` → `/pedidos/[id]` → `/propostas/nova` → `/proposta/[token]`. *(Detalhe só por código.)* Em sub-páginas nenhum item do menu fica ativo (match exato).

**D — Assinatura PRO.** `/dashboard/billing` → `SubscriptionModal` (Stripe) → webhook. Bom: cliente não se auto-promove.

---

## 5. Problemas encontrados

> Ordenados por gravidade. **MF#** = achados da passada mobile-first (evidência ao vivo em 360/768). "AUT/PUB" = autenticado só-código / público ao vivo.

| ID | Gravidade | Página/fluxo | Problema | Evidência | Impacto | Recomendação | Esforço | Prioridade |
|----|-----------|--------------|----------|-----------|---------|--------------|---------|------------|
| MF1 | Alto | `/dashboard/pedidos` (mobile) | Abas de filtro de status estouram a largura e **cortam "Fechado"** a 360px | Screenshot `dash-pedidos__360` (abas "Todos/Novo/Em análise/F…" clipadas) | Usuário não vê/usa o filtro Fechado no celular | Container com `overflow-x-auto` + gradiente/indicador de rolagem, ou `flex-wrap` | S | Imediato |
| P13 | Alto | `/dashboard` (mobile) | Maratona de 7+ seções + 3 cards que **duplicam** o menu | `dash-home__360` (scroll gigante) | Sobrecarga do dono iniciante no celular (Nielsen #8) | Remover os 3 cards finais; ocultar métricas/receita zeradas; priorizar checklist+pendências | M | Imediato |
| P1 | Alto | Global (mobile+tablet) — `Sidebar.tsx` | Menu colapsado só-ícone sem `aria-label`/`title`; a 768 o rail só-ícone é o padrão | Sidebar.tsx:266-297; `dash-home__768` mostra rail sem rótulos | Novos usuários e leitores de tela não sabem o que é cada item (WCAG 2.4.4/4.1.2) | `aria-label={item.label}`+`title`; `aria-hidden` nos SVGs; expandido na 1ª sessão | S | Imediato |
| P2 | Alto | Global — `app/globals.css` | `ink-muted #78716C` sobre `paper #F5F0E8` ≈ 4.4:1 (< 4.5 AA), em todos os labels 12px | globals.css:10; labels em todo form | Texto secundário de baixa leitura (WCAG 1.4.3) | Escurecer p/ ~`#5C544E`; usar `text-ink` em labels | S | Imediato |
| P3 | Alto | Erros/404 | 404 padrão do Next (inglês, sem marca/link); sem `error.tsx` | Screenshot `notfound-404`; `find app` vazio | Beco sem saída e quebra de confiança (Nielsen #9) | `app/not-found.tsx` + `app/global-error.tsx` com marca/PT/link | S | Imediato |
| P4 | Alto | Formulários (orçamento/auth) | Validação server-only: "e-mail ou telefone", data inválida; `required` do `CurrencyInput` em input oculto | QuoteRequestForm.tsx:121-145; CurrencyInput.tsx:25 | Erro só após submit (roundtrip) no celular (Nielsen #5) | Validar no cliente; `setCustomValidity`; `aria-invalid` | M | Imediato |
| P6 | Alto | A11y de erros — global | `aria-invalid`=0; `aria-live`/`role=alert` em 1 arquivo | grep | Erros não anunciados a leitores de tela (WCAG 4.1.3) | `role="alert"` nos blocos de erro; `aria-invalid`+`aria-describedby` | M | Curto |
| MF2 | Médio | `/dashboard/perfil` (mobile) | Form paredão de ~10 seções em coluna única, sem accordion nem salvar fixo | `dash-perfil__360` (scroll longo; grade de horários apertada) | Cansaço e erro; salvar fica longe no fim | Agrupar em seções colapsáveis; **barra "Salvar" fixa** no rodapé mobile | M | Curto |
| MF3 | Médio | `/dashboard/billing` (mobile) | Bloco "Plano atual / Free / Assinar PRO" **aparece duas vezes** (BillingCard + header do PlanUsageCard) | `dash-billing__360` | Redundância confunde ("por que dois?") | Unificar num único cabeçalho de plano | S | Curto |
| P7 | Médio | Design System — `ui/Button.tsx` | `Button` DS **nunca importado** (0 usos); botões `bg-ink` (preto) no auth vs `bg-leaf` (verde) no resto | grep import=0, bg-ink=11; "Entrar" preto × "Novo item"/"Assinar PRO"/"Enviar pedido" verdes | Cor primária inconsistente; manutenção duplicada (Nielsen #4) | Adotar `Button`; 1 cor primária (leaf) | M | Curto |
| P8 | Médio | Estados de carregamento — global | Nenhum `loading.tsx`; skeleton só no `AsyncInvoiceList` | `find app` vazio | Navegação sem feedback (pior em 4G) | `loading.tsx` por segmento com skeleton | M | Curto |
| P10 | Médio | `/u/[slug]/orcamento` | Barra de progresso de **3 passos** aparece mesmo sendo formulário de **1 página** (e no estado vazio) | `u-atelie-orcamento__360`, `u-allset-orcamento-empty__360` | Sugere passos inexistentes; confunde | Remover a barra (não há múltiplos passos) | S | Curto |
| P9 | Médio | Landing | Seções abaixo do hero invisíveis sem scroll (`opacity:0`+`whileInView`) | `landing__360/1440` (faixas vazias) | LCP/percepção; some sem JS | Animar só `y`/CSS; visível por padrão | M | Curto |
| P11 | Médio | Auth (cadastro/reset) | Sem "mostrar senha"/força; regra "8 caracteres" só no placeholder | `cadastro__360`; grep | Erros de senha, retrabalho (WCAG 3.3.2) | Toggle mostrar-senha; helper fixo | S | Curto |
| P12 | Médio | `/u/[slug]` | Eyebrow fixo "PRODUTOS E SERVIÇOS" mesmo p/ só-produtos/só-serviços | `u-allset` (PRODUCTS) | Rótulo impreciso | Derivar de `businessType` | S | Curto |
| P5 | Médio | Navegação — `Sidebar.tsx` | Estado ativo por match exato → detalhe/`nova` não destacam nada | Sidebar.tsx:266 | Perda de orientação (WCAG 2.4.8) | `startsWith(href+"/")` | S | Curto |
| P14 | Médio | Sidebar — logout | Sem "Sair" no menu; só na home | `dash-home` | Recorrente não acha como sair | "Sair" no rodapé do menu | S | Médio |
| P15 | Médio | Movimento — global | `prefers-reduced-motion` só em 2 componentes | grep; Button.tsx:32 | Desconforto vestibular (WCAG 2.3.3) | `useReducedMotion` global | M | Médio |
| P16 | Médio | Temas PRO — `globals.css` | 6 presets sem auditoria de contraste | globals.css:48-102 | Vitrine PRO pode ficar ilegível (1.4.3) | Validar cada preset em AA | M | Médio |
| P19 | Baixo | Labels — global | `uppercase tracking-widest` 12px em todo form | QuoteRequestForm.tsx:32 | Uppercase reduz leitura; 12px pequeno | 13px, sem uppercase | S | Baixo |
| P20 | Baixo | SVGs decorativos | Muitos sem `aria-hidden` (12 no total) | grep | Ruído p/ leitor de tela | `aria-hidden="true"` | S | Baixo |
| P17 | Baixo | Auth mobile | Painel verde some → sem marca no login/esqueci/verificar mobile | `login__360` | Perda de contexto de marca | Wordmark "Vitriny" no topo mobile | S | Curto |
| P18 | Baixo (só desktop) | Auth desktop | Painel verde esquerdo vazio | `login__desktop` (1440) | **Irrelevante no mobile** (painel oculto) — baixa prioridade na moldura mobile-first | Preencher só se sobrar tempo | S | Baixo |
| P21 | Oportunidade | Detalhe/listas | Sem breadcrumbs | (código) | Orientação/volta | Breadcrumb "← Pedidos" | S | Médio |
| P22 | Oportunidade | Limites de plano | Mensagens de limite sem CTA de upgrade | backlog §8.3 | Perde conversão no pico | Link "Conhecer o PRO →" | S | Curto |
| P23 | Oportunidade | `LandingPainStrip` | Componente órfão | backlog §4 | Código morto | Plugar ou remover | S | Baixo |

---

## 6. Análise tela por tela

### `/u/[slug]` — tela-herói (mobile, PUB) — **ponto mais forte**
Evidência `u-atelie__360`. Hierarquia impecável: header verde com nome/tagline → CONTATOS (WhatsApp verde + Ligar lado a lado) → E-mail (Enviar e-mail full-width) → LOCAL (+Ver no mapa) → "O que ofereço" com cards de item (badge tipo, preço/"SOB CONSULTA", CTA por modo). Alvos de toque grandes, sem overflow. **Único ajuste:** P12 (eyebrow por tipo). É a tela que mais converte e está bem resolvida — manter como referência de qualidade para as demais.

### `/u/[slug]/orcamento` (mobile, PUB)
Evidência `u-atelie-orcamento__360`. Form limpo, campos full-width, select nativo, textarea, CTA verde contextual. **Problemas:** P10 (barra de 3 passos enganosa), P4 (sem helper "e-mail ou telefone"; validação server-only). 

### Landing (PUB)
`landing__360`. Hero forte; **P9** (seções invisíveis sem scroll).

### Login/Cadastro/Esqueci/Verificar (PUB)
`login__360`, `cadastro__360`. Consistentes e limpos no mobile. **Problemas:** P7 (botão preto vs verde), P11 (senha), P17 (sem marca mobile), P2 (labels). Google não testável.

### `/dashboard` (mobile, AUT ao vivo)
`dash-home__360`. **Maratona vertical:** saudação → link público → checklist (5 passos) → pendências → receita R$ 0,00 → 4 métricas → atividades → uso do plano → **3 cards que repetem o menu**. **P13** é o problema central da área autenticada mobile. Bom: checklist adaptado e pendências acionáveis. `dash-home__768`: a 768 aparece o rail só-ícone (P1).

### `/dashboard/pedidos` (mobile, AUT ao vivo)
`dash-pedidos__360`. Cabeçalho + badge "1 novo" + **abas de filtro que cortam "Fechado" (MF1)**. Card do pedido: avatar, badge status, data, nome/serviço **truncados com reticências** (bom), chevron p/ detalhe — limpo com 1 badge. *Não confirmei* overflow com muitos badges (§4).

### `/dashboard/servicos` (mobile, AUT ao vivo)
`dash-servicos__360`. "Novo item" verde (topo), cards de item com badge de tipo + modo de venda + preço + chevron. Limpo. Reforça P7 (verde aqui, preto no auth).

### `/dashboard/perfil` (mobile, AUT ao vivo)
`dash-perfil__360`. **MF2:** ~10 seções em coluna única (negócio, tipo, contato, redes, horários, aparência, Pix, zona de perigo), grade de horários apertada, "Salvar dados" só no fim. Precisa de agrupamento colapsável + salvar fixo.

### `/dashboard/billing` (mobile, AUT ao vivo)
`dash-billing__360`. **MF3:** bloco de plano duplicado. Bom: lista "PLANO PRO INCLUI" e empty state de faturas.

### 404/erros (PUB)
`notfound-404`. **P3** (padrão Next, inglês).

---

## 7. Arquitetura da informação
Menu por domínio (Dashboard, Pedidos, Itens, Modelos, Assinatura, Perfil) é adequado. Ajustes: "Modelos" → "Modelos de proposta"; remover **caminhos redundantes** (cards da dashboard, P13); dashboard = decisão, não navegação; adicionar "Sair" (P14); orientação em sub-páginas (P5).

## 8. Navegação
Drawer mobile + rail desktop. Problemas: P1 (sem rótulo acessível — inclui tablet 768), P5 (ativo exato), P14 (sem logout), MF1 (abas de filtro cortadas). Positivo: telas públicas têm "← Voltar à vitrine"; `returnTo` preservado nas actions.

## 9. Interface visual
Identidade coesa; cards/sombras consistentes (forte). Problemas objetivos: P2 (contraste), P19 (labels 12px uppercase), P13 (densidade). Fraunces+Jakarta = par forte.

## 10. Design system
`Button` DS com **0 usos** (P7) → botões inline em 11 arquivos, cor primária dupla (preto/verde, confirmado nas capturas). Inputs/labels por cópia (`inputClass`/`labelClass`). Faltam tokens de estado (foco/erro), `Field`, `Alert`, `Tooltip`, `Skeleton`. **Sem tabelas** (listas em cards — bom p/ mobile). **DS mínimo proposto:** `Button` (1 primária leaf) em 100% das ações; `Field` (label 13px `text-ink`, erro `aria-invalid`/`aria-describedby`); `Alert` com `role`; foco global `ring-2 ring-leaf ring-offset-2`; `Tooltip` p/ nav colapsada; `Skeleton` p/ `loading.tsx`.

## 11. Formulários
Base sólida (Zod, campos condicionais, `role="alert"` no orçamento). **No mobile:** selects/teclado numérico nativos (ótimo); alvos 44px (ótimo). **Problemas:** obrigatoriedade só com "*" e sem helper "e-mail ou telefone" (P4); placeholders como instrução (P11); `required` do CurrencyInput em input oculto (P4); **perfil paredão sem salvar fixo (MF2)**. **Reescritas:** senha → helper "Use pelo menos 8 caracteres."; orçamento → "Informe ao menos um: e-mail ou telefone."

## 12. Estados da interface
| Estado | Situação |
|---|---|
| Carregamento (rota) | **Ausente** (sem `loading.tsx`, P8) |
| Carregamento (ação) | Presente ("Enviando…/Processando…") |
| Sucesso | Parcial (querystring) — sem padrão forte |
| Erro (form) | Visual sim, **sem `aria-live`/`aria-invalid`** (P6) |
| Erro (rota/500) | **Ausente** (sem `error.tsx`, P3) |
| Vazio | **Bom** (perfil, orçamento, faturas) |
| Sem permissão | Redireciona a `/login` (ok) |
| 404 | **Padrão Next inglês** (P3) |
| Desabilitado | `disabled:opacity-50` |
| Confirmação/irreversível | `ConfirmModal` (excluir item/conta) |

## 13. Responsividade (com evidência mobile-first)

**360px (celular pequeno — baseline):**
- **Públicas:** `/u/[slug]`, orçamento, login, cadastro, esqueci, verificar — **bem resolvidas**, sem scroll horizontal, coluna única, botões grandes. Landing com P9.
- **Autenticadas:** `/dashboard` sobrecarregado (P13); `/pedidos` **corta o filtro (MF1)**; `/perfil` paredão (MF2); `/billing` duplica plano (MF3); `/servicos` ok.

**414px (celular grande):** sem diferenças relevantes das de 360 nas públicas capturadas (mesmo layout de coluna única).

**768px (tablet):** ativa o breakpoint `md:` → **rail de menu só-ícone vira o padrão (P1)**; grids passam a 2 colunas (métricas, contatos). Dashboard continua longo, porém melhor distribuído. Sem sobreposição observada.

**1440px (desktop):** split-screen no auth (painel verde vazio, P18 — irrelevante no mobile), grids 3–4 colunas. Ok.

**Não confirmado:** overflow do card `h-32` com muitos badges (§4); monitor >1440.

## 14. Acessibilidade (WCAG 2.2)
- **Contraste (1.4.3):** falha — `ink-muted` ~4.4:1 (P2); temas não auditados (P16).
- **Nome acessível (2.4.4/4.1.2):** nav só-ícone sem rótulo (P1) — afeta mobile colapsado E tablet 768.
- **Teclado/foco (2.1.1/2.4.7):** inputs têm ring; `Button` (não usado) tem `focus-visible`; botões inline podem não ter foco visível.
- **Erros (3.3.1/4.1.3):** `aria-invalid`=0, `aria-live`=1 (P6).
- **Movimento (2.3.3):** parcial (P15).
- **Alvos de toque (2.5.8):** 44px — **conforme** (ponto forte mobile).
- **Alt/labels:** QR Pix com `alt`; `<label htmlFor>` presente; SVGs decorativos faltando `aria-hidden` (P20).
- **Modais:** `role=dialog aria-modal`+`Escape` no Subscription; foco preso não confirmado.

## 15. Conteúdo e microcopy
Tom PT-BR claro (forte). Reescritas: 404 → "Página não encontrada. O link pode estar quebrado ou a página foi movida." + "Voltar ao início"; senha → helper fixo; orçamento → "Informe ao menos um: e-mail ou telefone."; eyebrow do perfil por tipo; "Modelos" → "Modelos de proposta". Empty states já bons.

## 16. Confiança e segurança percebida
Forte: textos deixam claro que o Pix é confirmado **manualmente**; exclusão de conta confirma e explica anonimização; cliente não se auto-promove a PRO. Lacunas: sem canal de ajuda/suporte em nenhuma tela; sucesso pós-envio pouco persistente; considerar link a `/privacidade` no orçamento.

## 17. Desempenho percebido
Sem `loading.tsx` (P8) → sensação de travamento em 4G (crítico no público mobile). Landing com layout que "aparece" ao rolar (P9). Billing carrega faturas com skeleton (bom). Skeletons ausentes no resto.

## 18. Quick wins
| Quick win | Alteração | Impacto | Esforço |
|---|---|---|---|
| MF1 filtro de pedidos | `overflow-x-auto`+indicador ou `flex-wrap` | Alto (mobile) | S |
| P1 nome no menu | `aria-label`+`title`+`aria-hidden` | Alto (a11y/tablet) | S |
| P3 not-found/error | 2 telas com marca/PT/link | Alto (confiança) | S |
| P2 contraste | 1 token | Alto (legibilidade) | S |
| MF3 plano duplicado | unificar cabeçalho | Médio | S |
| P10 barra de progresso | remover | Médio | S |
| P12 eyebrow por tipo | derivar de `businessType` | Médio | S |
| P13 remover 3 cards | apagar bloco redundante | Médio-Alto | S |
| P5 ativo por startsWith | 1 linha | Médio | S |
| P14 "Sair" no menu | item no rodapé | Médio | S |
| P22 CTA upgrade | link nas mensagens de limite | Médio (conversão) | S |

## 19. Melhorias estruturais
- **Redesenho do dashboard mobile** (P13): reduzir a "próxima ação".
- **Formulário de perfil em seções + salvar fixo** (MF2).
- **Adotar o `Button` DS** + `Field`/`Alert`/`Skeleton`/`Tooltip` (P7).
- **Estados de rota** `loading.tsx`/`error.tsx` (P8/P3).
- **A11y sistêmica** (P2/P6/P15/P16).
- **Validação client-side** (P4).

## 20. Matriz de priorização
- **Alto impacto / baixo esforço (já):** MF1, MF3, P1, P2, P3, P5, P10, P12, P13(remover cards), P14, P22.
- **Alto impacto / alto esforço (planejar):** P4, P7 (DS), P8 (loading/error), P13 (redesenho), MF2 (perfil), P6.
- **Baixo impacto / baixo esforço:** P11, P17, P19, P20, P23.
- **Baixo impacto / alto esforço (adiar):** P16, P18 (desktop-only), P15.

## 21. Plano de ação
**Imediato:** MF1, P1, P2, P3, P13 (remover cards redundantes), P4/P6 (formulários) — afeta `Sidebar.tsx`, `globals.css`, `app/*`, dashboard, `/pedidos`.
**Curto prazo:** MF2 (perfil em seções + salvar fixo), MF3, P5, P7 (adotar Button), P8 (loading), P9, P10, P11, P12, P22.
**Médio prazo:** redesenho da dashboard, P14, P15, P16, P21, DS (`Field`/`Alert`/`Skeleton`/`Tooltip`).
**Longo prazo:** amadurecer/documentar o DS; a11y com leitor de tela real; monitor amplo; admin; ajuda/suporte; OG images.

## 22. Propostas de redesign (mobile-first)

**A) Dashboard mobile.** Ordem: saudação (garantir que o hambúrguer não cubra "Olá, {nome}") → **link público** → **checklist (até concluir)** → **pendências** → resto **colapsável/oculto quando zerado**. **Remover** os 3 cards Vitrine/Itens/Pedidos. Ação principal: próxima pendência. Estados: skeleton + empty ("Compartilhe seu link para o primeiro pedido").

**B) `/pedidos` mobile.** Filtro em faixa `overflow-x-auto` com gradiente/indicador (nunca cortar); card com truncação (mantida) e, com muitos badges, quebrar em linha em vez de altura fixa `h-32`. Manter chevron p/ detalhe.

**C) `/perfil` mobile.** Seções colapsáveis (Negócio · Tipo · Contato · Redes · Horários · Aparência · Pix · Excluir) + **barra "Salvar" fixa** no rodapé. Grade de horários com toque confortável.

**D) 404/erro.** Card centralizado, wordmark, título PT, botão "Voltar ao início". Responsivo em qualquer viewport.

**E) `/u/[slug]/orcamento`.** Remover a barra de 3 passos; helper "ao menos um: e-mail ou telefone"; erro por campo com `aria-invalid`; sucesso persistente ("Pedido enviado! O negócio responde em breve.").

## 23. Conclusão
**Diagnóstico.** O Vitriny é **mobile-first de verdade e brilha na experiência pública no celular** — a tela-herói `/u/[slug]` e o orçamento são fortes. O trabalho pendente está na **área autenticada mobile** (dashboard denso, filtro que corta, perfil paredão, duplicações) e em **fundamentos transversais** (a11y, design system, estados de rota). Nenhum impede o uso hoje, mas juntos elevam o abandono do dono iniciante e excluem usuários com deficiência.

**Maturidade:** Público mobile 8/10 · Autenticado mobile 5/10 · UI 7/10 · A11y 4/10 · DS 4/10.

**Sequência recomendada:** (1) quick wins mobile e a11y (MF1, MF3, P1, P2, P3, P13-cards, P10, P12); (2) formulários (P4, P6, MF2); (3) design system + estados de rota (P7, P8); (4) redesenho da dashboard.

---

## Limitações desta auditoria (explícitas)
- Dashboard/área autenticada capturados **ao vivo em 360 e 768** com dados semeados (removidos); `/pedidos/[id]` e `/propostas/nova` só por código.
- Login social **não testável** (Google placeholder).
- Overflow do card `h-32` com muitos badges **não reproduzido** (dados leves).
- Contrastes calculados dos tokens; monitor >1440 não avaliado.
- Screenshots: `/tmp/vitriny-audit/` (públicas 390/1440) e `/tmp/vitriny-audit/mf/` (360/414/768 + dashboard).
