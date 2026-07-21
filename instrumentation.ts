// Fixa o fuso do processo no horário do Brasil (America/Sao_Paulo, sem horário
// de verão desde 2019). Sem isso, um servidor em UTC (ex.: Vercel) calcula o
// reset do limite mensal e a expiração de proposta na meia-noite UTC (21h de
// Brasília), errando o dia por ~3h. As funções de data em lib/utils/date.ts e
// lib/plan-limits.ts usam horário local; este hook garante que "local" = Brasil.
// Pode ser sobrescrito definindo TZ no ambiente do deploy.
export async function register() {
  if (!process.env.TZ) {
    process.env.TZ = "America/Sao_Paulo";
  }
}
