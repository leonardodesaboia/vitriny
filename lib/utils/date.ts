export function isValidISODate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    year >= 1900 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function brDateDigitsToISO(digits: string) {
  if (!/^\d{8}$/.test(digits)) return "";

  const isoDate = `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  return isValidISODate(isoDate) ? isoDate : "";
}

function localDateToISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isISODateBeforeToday(value: string, referenceDate = new Date()) {
  return isValidISODate(value) && value < localDateToISO(referenceDate);
}

export function startOfLocalDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

// validUntil é salvo como meia-noite local do dia escolhido; a proposta
// permanece válida durante o dia inteiro, expirando só no dia seguinte.
export function isProposalExpired(validUntil: Date | null, now = new Date()) {
  if (!validUntil) return false;

  const endOfValidDay = startOfLocalDay(validUntil);
  endOfValidDay.setDate(endOfValidDay.getDate() + 1);

  return now.getTime() >= endOfValidDay.getTime();
}

// Data "de hoje" (YYYY-MM-DD) em um fuso específico, independente do fuso do
// servidor. Usado para validar datas escolhidas por usuários no Brasil.
export function todayISOInTimeZone(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}
