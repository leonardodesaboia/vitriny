# Etapa 3 — Perfil público, conversão e SEO

**Data:** 2026-06-30
**Status:** Aprovado
**Sem migration — apenas UI e lógica de apresentação.**

---

## Objetivo

Transformar `/u/[slug]` em página comercial completa: CTAs de conversão em todos os estados, contato via WhatsApp, "Como funciona" condicional por tipo de serviço, SEO/Open Graph para prévia no WhatsApp, e acessibilidade básica.

---

## Arquivos alterados

| Arquivo | Natureza da mudança |
|---|---|
| `app/u/[slug]/page.tsx` | CTA no hero, WhatsApp no card de telefone, "Como funciona" condicional, `generateMetadata` |
| `components/public/PublicServicesGrid.tsx` | Estado vazio com CTA, CTA de fallback pós-grid, `useReducedMotion` |
| `components/quote-request/QuoteRequestForm.tsx` | `role="alert"` na mensagem de erro, `aria-live="polite"` na mensagem de sucesso |

Nenhum arquivo novo. Sem migration de banco.

---

## 3.1 — CTA geral no hero

Adicionar botão "Solicitar orçamento →" dentro da seção hero (fundo verde), após o parágrafo de descrição do prestador.

- Link para `/u/${slug}/orcamento` sem `serviceId`.
- Sempre visível, independente de haver serviços cadastrados.
- Estilo: botão branco com texto `leaf`, tamanho equivalente ao CTA dos cards de serviço.
- `focus-visible` explícito (ring).

---

## 3.2 — Estado sem serviços

Quando `profile.services.length === 0`, `PublicServicesGrid` deve:

- Exibir card com texto: "Este prestador aceita solicitações personalizadas. Descreva o que você precisa e ele entrará em contato com uma proposta."
- Botão "Solicitar orçamento →" dentro do card, apontando para `/u/${slug}/orcamento`.
- **Não** exibir a mensagem atual "Este prestador ainda não possui serviços publicados."

A seção "Como funciona" ainda aparece nesse estado, usando o conteúdo do fluxo CUSTOM (pedido → análise → proposta).

---

## 3.3 — CTA de fallback após a grid

Quando há serviços listados, exibir abaixo da grid:

> "Não encontrou o que procura? [Envie sua solicitação →]"

Link para `/u/${slug}/orcamento`. Texto discreto, não concorre visualmente com os cards.

---

## 3.4 — "Como funciona" condicional

A seção mantém o formato de 3 cards numerados. O conteúdo muda conforme os tipos de serviço ativos do perfil.

### Lógica de seleção

```
hasCustom  = services.some(s => s.pricingType === "CUSTOM")
hasFixed   = services.some(s => s.pricingType === "FIXED")
hasPixRequired = services.some(
  s => s.pricingType === "FIXED" &&
       s.fixedServiceCheckoutMode === "REQUIRE_PIX_PAYMENT"
)
noServices = services.length === 0
```

### Conteúdos por caso

**CUSTOM only ou sem serviços:**
1. Preencha o formulário — Conte o que você precisa em poucos campos.
2. Prestador avalia — O prestador analisa seu pedido e prepara uma proposta.
3. Receba a proposta — Proposta com valor, prazo e condições para aprovar.

**FIXED/REQUEST_ONLY only:**
1. Escolha o serviço — Selecione o serviço desejado e preencha seus dados.
2. Prestador avalia — O prestador analisa a solicitação e confirma disponibilidade.
3. Prestador entra em contato — Você recebe o retorno pelo contato informado.

**FIXED/REQUIRE_PIX_PAYMENT only:**
1. Preencha seus dados — Informe nome e contato para continuar.
2. Realize o pagamento Pix — O pagamento é exigido para confirmar o pedido.
3. Confirmação manual — O prestador confirma o recebimento e finaliza o agendamento.

**Misto (CUSTOM + FIXED, com ou sem Pix):**
- Subtítulo: "Este prestador oferece serviços com preço fixo e sob orçamento."
1. Escolha ou descreva — Selecione um serviço da lista ou descreva livremente o que precisa.
2. Prestador avalia — O prestador analisa e confirma disponibilidade ou prepara uma proposta.
3. Receba o retorno — Você é contactado com as próximas etapas.

### Regra de precedência para perfil misto

Se `hasCustom && hasFixed` → usar conteúdo "Misto".
Se apenas `hasFixedPixRequired` (sem CUSTOM e sem REQUEST_ONLY) → usar conteúdo PIX.
Se apenas `hasFixed` (REQUEST_ONLY, sem CUSTOM) → usar conteúdo FIXED.
Se apenas `hasCustom` ou `noServices` → usar conteúdo CUSTOM.

---

## 3.5 — Contato: WhatsApp + tel:

O card de telefone passa a ter dois links quando `profile.phone` está disponível:

- **Botão principal "WhatsApp":** link `wa.me/{numero}?text={mensagem}` abrindo em `_blank`.
  - Mensagem pré-preenchida: `"Olá {businessName}, vi seu perfil no OrçaFácil e gostaria de solicitar um orçamento."`
  - Usar `phoneToWhatsAppNumber` (já existe em `lib/utils/phone.ts`).
- **Link secundário "Ligar":** `href={phoneToTelHref(phone)}` com texto menor/discreto.

Apenas `wa.me`. Sem `api.whatsapp.com` ou qualquer integração de API.

Quando `profile.phone` não está disponível, o card de telefone não é renderizado (comportamento atual mantido).

---

## 3.6 — SEO: `generateMetadata`

Implementar `generateMetadata` em `app/u/[slug]/page.tsx`.

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: { businessName: true, description: true, isPublished: true }
  });

  if (!profile || !profile.isPublished) {
    return { robots: { index: false, follow: false } };
  }

  const title = `${profile.businessName} · OrçaFácil`;
  const description = profile.description
    ?? `Solicite um orçamento para ${profile.businessName}.`;
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/u/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
```

Sem `og:image` por ora — WhatsApp ainda exibe título e descrição.

---

## 3.7 — Acessibilidade

### Hierarquia de títulos

```
h1 → businessName (hero)
h2 → "O que ofereço" (seção de serviços)
h2 → "Como funciona" (seção explicativa)
h3 → nome de cada serviço nos cards (já implementado em PublicServicesGrid)
h3 → título de cada step em "Como funciona"
```

### Formulário (`QuoteRequestForm`)

- Mensagem de erro: adicionar `role="alert"` ao `<p>` de erro inline.
- Mensagem de sucesso na página `/orcamento`: o bloco de sucesso já é renderizado condicionalmente; adicionar `aria-live="polite"` ao container.

### Animações

`PublicServicesGrid` usa framer-motion. Adicionar `useReducedMotion` do framer-motion: quando `true`, desabilitar `variants` de animação (retornar objeto vazio ou `{ hidden: {}, show: {} }`).

### Foco visível

Todos os novos botões/links de CTA devem ter `focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2` (padrão já usado no projeto).

---

## Critérios de aceite

- [ ] Perfil sem serviços: exibe CTA para solicitar orçamento, não exibe mensagem de "sem serviços publicados".
- [ ] Perfil com serviços: hero tem CTA geral; grid tem CTA de fallback após a listagem.
- [ ] "Como funciona" reflete os tipos de serviço do perfil.
- [ ] Card de telefone exibe botão WhatsApp e link Ligar quando phone disponível.
- [ ] Compartilhar o link no WhatsApp exibe nome e descrição do prestador.
- [ ] Perfil não publicado: `robots: noindex`.
- [ ] Sem regressões nos fluxos de orçamento existentes.
- [ ] Animações desabilitadas com `prefers-reduced-motion`.
