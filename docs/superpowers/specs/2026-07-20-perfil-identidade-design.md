# Design — Presença e horários no perfil ("link na bio")

Data: 2026-07-20
Status: aprovado em brainstorming, aguardando plano de implementação

## Objetivo

Tornar a vitrine pública (`/u/[slug]`) a presença online canônica do negócio — o link que o dono coloca na bio do Instagram. Esta entrega adiciona ao perfil: horário de funcionamento com badge "Aberto agora", links sociais e localização clicável para o Google Maps.

Todos os campos são **opcionais**. A vitrine só exibe o que estiver preenchido, seguindo o padrão atual de telefone/e-mail/cidade. Todos os recursos são **FREE** (identidade do negócio não é gatilho de upgrade; princípio do `BACKLOG_TECNICO.md` §8: o limite deve doer no dono, nunca aleijar a vitrine).

Fora do escopo desta entrega: OG image dinâmica (fica para entrega seguinte), estatísticas de visita, modo cardápio, galeria de fotos.

## Modelo de dados

Cinco campos novos em `ProviderProfile` (nenhum model novo):

```prisma
address       String?   // rua, número, bairro — complementa city/state existentes
instagram     String?   // handle ou URL, como o dono digitar
facebook      String?
tiktok        String?
businessHours Json?     // estrutura fixa de 7 dias, validada por Zod
```

Migration única: `add_profile_identity_fields`. Sem backfill — campos novos nascem `null` para todos os perfis.

### Estrutura de `businessHours`

Array fixo de 7 posições, índice 0 = domingo (compatível com `Date.getDay()`):

```ts
type DayHours = { open: string; close: string } | null; // null = fechado
type BusinessHours = [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours];
```

- `open`/`close` no formato `"HH:MM"` (24h).
- `close < open` significa fechamento após a meia-noite (ex.: bar `18:00`–`02:00`); o helper trata a virada de dia.
- `businessHours = null` no perfil = dono não cadastrou horários; a seção inteira não aparece na vitrine.

Justificativa do JSON vs model relacional: horários são sempre lidos/escritos em bloco junto com o perfil; não existirá query por horário. Um model `BusinessHour` (7 linhas por perfil) só adicionaria join e CRUD sem benefício.

## Helper `lib/business-hours.ts`

Helper puro, sem dependência de banco, no padrão de `lib/service-sale-mode.ts`:

- `parseBusinessHours(value: unknown): BusinessHours | null` — valida/normaliza o JSON vindo do banco (defensivo contra dados malformados; retorna `null` se inválido).
- `isOpenAt(hours: BusinessHours, date: Date): boolean` — considera virada de meia-noite (um horário `18:00–02:00` de sábado mantém aberto na madrugada de domingo).
- `getTodayLabel(hours: BusinessHours, date: Date): string` — ex.: `"fecha às 18:00"`, `"abre às 08:00"`, `"fechado hoje"`.
- `formatWeek(hours: BusinessHours): { day: string; label: string }[]` — para o card de horários da semana ("Seg 08:00–18:00", "Dom Fechado").
- Constantes de labels dos dias em pt-BR.

## Normalização de redes sociais — `lib/social-links.ts`

O dono digita como souber (`@meunegocio`, `meunegocio` ou URL completa). Helper puro:

- `normalizeSocialUrl(network: "instagram" | "facebook" | "tiktok", value: string): string | null` — retorna a URL canônica (`https://instagram.com/meunegocio`, `https://tiktok.com/@meunegocio`, `https://facebook.com/meunegocio`) ou `null` se não normalizável.
- O valor **digitado** é o que persiste no banco; a normalização acontece na renderização (e na validação Zod, que rejeita valores não normalizáveis).

## Link do Google Maps

Sem campo de URL: o link é montado na renderização com os dados existentes + `address`:

```
https://www.google.com/maps/search/?api=1&query=<encodeURIComponent([address, city, state].filter(Boolean).join(", "))>
```

- Com `address` preenchido: leva até a porta do negócio.
- Sem `address` mas com cidade: busca pela cidade (comportamento atual, agora clicável).
- Sem nenhum dos dois: card de localização não aparece (comportamento atual).

## Formulário do perfil (`/dashboard/perfil`)

Nova seção **"Presença e horários"** no formulário existente:

1. **Endereço** — input de texto simples (rua, número, bairro), opcional.
2. **Redes sociais** — três inputs opcionais (Instagram, Facebook, TikTok) com placeholder `@seunegocio`.
3. **Horário de funcionamento** — editor por dia da semana:
   - cada dia: toggle "fechado" + dois inputs de hora (`<input type="time">`);
   - atalho "copiar seg. para os dias úteis" para reduzir digitação;
   - estado inicial: todos os dias sem horário (equivale a não cadastrado); o form só envia `businessHours` se ao menos um dia tiver horário.

A action existente de perfil (`lib/actions/provider-profile.ts`) e o schema Zod (`lib/validations/provider-profile.ts`) ganham os campos novos. Validações: horários bem-formados (`HH:MM`), dia aberto exige `open` e `close`, redes rejeitam valor não normalizável, `address` com limite de tamanho.

## Vitrine pública (`/u/[slug]`)

Tudo condicional ao preenchimento:

1. **Badge no hero**: 🟢 "Aberto agora · fecha às 18:00" / 🔴 "Fechado · abre às 08:00". Calculado **no navegador** por um client component pequeno (`components/public/OpenNowBadge.tsx`) que recebe `businessHours` serializado. Motivo: o visitante quase sempre está na mesma cidade do negócio, então o relógio local dele é a referência correta — e evita fuso do servidor e cache de HTML com estado errado. Sem JS, o badge simplesmente não aparece (progressive enhancement; nada quebra).
2. **Card "Horários"**: lista da semana server-rendered (via `formatWeek`), junto aos cards de contato existentes.
3. **Card "Localização"**: valor atual vira link "Ver no mapa →" (URL de busca do Maps), `target="_blank"`.
4. **Ícones sociais** no hero, abaixo da descrição do negócio: links com `rel="noopener noreferrer"`, exibindo apenas as redes preenchidas.

A query da página (`getProfile`) passa a selecionar os campos novos.

## Testes

- `tests/unit/business-hours.test.ts`: aberto/fechado em horário comum, virada de meia-noite, dia fechado, dados malformados (`parseBusinessHours` retorna `null`), labels de formatação.
- `tests/unit/social-links.test.ts`: normalização de `@handle`, handle puro, URL completa, valor inválido.
- Testes da action de perfil (`tests/actions/`): persistência dos campos novos, rejeição de horário malformado e rede inválida.
- Validação obrigatória do projeto: `npm run lint`, `npm run build`, `npx prisma validate`, `npm test`.

## Documentação a atualizar na implementação

`docs/DATABASE.md` (campos novos do `ProviderProfile`), `docs/PROJECT_OVERVIEW.md` (decisão de produto: recursos de identidade são FREE), `docs/AI_HANDOFF.md` (registro da mudança) e `docs/MVP_FLOW.md` (passo do perfil).

## Riscos e decisões registradas

- **Fuso horário**: resolvido pelo cálculo client-side. Se um dia houver campo de fuso por perfil, o helper já recebe `Date` e isola a decisão.
- **`businessHours` como JSON**: perde constraint de banco; compensado por validação Zod na escrita e `parseBusinessHours` defensivo na leitura.
- **Redes sociais**: persistir o valor digitado (não a URL) mantém o formulário fiel ao que o dono vê ao reabrir a edição.
