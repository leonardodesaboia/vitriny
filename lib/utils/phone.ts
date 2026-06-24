export function onlyPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function stripBrazilCountryCode(digits: string): string {
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

export function formatPhoneBR(value: string | null | undefined): string {
  if (!value) return "";

  const digits = stripBrazilCountryCode(onlyPhoneDigits(value)).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function normalizePhoneBR(value: string | null | undefined): string | null {
  const formatted = formatPhoneBR(value);
  return formatted === "" ? null : formatted;
}

export function isValidPhoneBR(value: string | null | undefined): boolean {
  if (!value) return true;

  const digits = stripBrazilCountryCode(onlyPhoneDigits(value));
  return digits.length === 10 || digits.length === 11;
}

export function phoneToTelHref(value: string): string {
  const digits = stripBrazilCountryCode(onlyPhoneDigits(value));
  return digits ? `tel:+55${digits}` : "";
}

export function phoneToWhatsAppNumber(value: string): string {
  const digits = onlyPhoneDigits(value);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits;
  }

  const localDigits = stripBrazilCountryCode(digits);
  return localDigits ? `55${localDigits}` : "";
}
