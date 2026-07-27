import { isValidPhoneBR, onlyPhoneDigits } from "@/lib/utils/phone";

// Valores usados no select do formulário de perfil e persistidos em
// ProviderProfile.pixKeyType. Não alterar sem migrar os dados existentes.
export const PIX_KEY_TYPES = [
  "CPF",
  "CNPJ",
  "E-mail",
  "Telefone",
  "Chave aleatória"
] as const;

export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stripDocumentPunctuation(value: string) {
  return value.replace(/[.\-/\s]/g, "");
}

function isRepeatedChars(value: string) {
  return value.length > 0 && value.split("").every((c) => c === value[0]);
}

function cpfCheckDigit(digits: number[], initialWeight: number) {
  const sum = digits.reduce(
    (acc, digit, index) => acc + digit * (initialWeight - index),
    0
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCpf(value: string) {
  const cpf = stripDocumentPunctuation(value);
  if (!/^\d{11}$/.test(cpf) || isRepeatedChars(cpf)) return false;

  const digits = cpf.split("").map(Number);
  const dv1 = cpfCheckDigit(digits.slice(0, 9), 10);
  const dv2 = cpfCheckDigit(digits.slice(0, 10), 11);

  return dv1 === digits[9] && dv2 === digits[10];
}

// Pesos oficiais do CNPJ, do primeiro para o último caractere da base.
const CNPJ_DV1_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_DV2_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function cnpjCheckDigit(chars: string, weights: number[]) {
  // O CNPJ alfanumérico (vigente desde 2026) usa o valor ASCII - 48,
  // o que também cobre o CNPJ numérico tradicional.
  const sum = chars
    .split("")
    .reduce((acc, char, index) => acc + (char.charCodeAt(0) - 48) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCnpj(value: string) {
  const cnpj = stripDocumentPunctuation(value).toUpperCase();
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || isRepeatedChars(cnpj)) return false;

  const dv1 = cnpjCheckDigit(cnpj.slice(0, 12), CNPJ_DV1_WEIGHTS);
  const dv2 = cnpjCheckDigit(cnpj.slice(0, 13), CNPJ_DV2_WEIGHTS);

  return dv1 === Number(cnpj[12]) && dv2 === Number(cnpj[13]);
}

function isValidPixEmail(value: string) {
  return EMAIL_REGEX.test(value.trim()) && value.trim().length <= 77;
}

function isValidPixPhone(value: string) {
  const digits = onlyPhoneDigits(value);
  return digits.length > 0 && isValidPhoneBR(value);
}

function isValidRandomKey(value: string) {
  return UUID_REGEX.test(value.trim());
}

const VALIDATORS: Record<PixKeyType, (value: string) => boolean> = {
  CPF: isValidCpf,
  CNPJ: isValidCnpj,
  "E-mail": isValidPixEmail,
  Telefone: isValidPixPhone,
  "Chave aleatória": isValidRandomKey
};

// Ordem de inferência: formatos estritos primeiro (dígito verificador,
// e-mail, UUID) e telefone por último, que é o mais ambíguo.
const INFERENCE_ORDER: PixKeyType[] = [
  "CPF",
  "CNPJ",
  "E-mail",
  "Chave aleatória",
  "Telefone"
];

function isKnownPixKeyType(type: string | null | undefined): type is PixKeyType {
  return !!type && (PIX_KEY_TYPES as readonly string[]).includes(type);
}

export function inferPixKeyType(key: string): PixKeyType | null {
  return INFERENCE_ORDER.find((type) => VALIDATORS[type](key)) ?? null;
}

export function isValidPixKey(key: string, type: string | null | undefined) {
  if (isKnownPixKeyType(type)) return VALIDATORS[type](key);
  return inferPixKeyType(key) !== null;
}

// Converte a chave para o formato registrado no DICT, que é o exigido no
// payload do QR Code: documentos sem pontuação, telefone como +55DDDNÚMERO.
export function normalizePixKey(
  key: string,
  type: string | null | undefined
): string {
  const resolvedType = isKnownPixKeyType(type) ? type : inferPixKeyType(key);

  switch (resolvedType) {
    case "CPF":
      return stripDocumentPunctuation(key);
    case "CNPJ":
      return stripDocumentPunctuation(key).toUpperCase();
    case "E-mail":
      return key.trim().toLowerCase();
    case "Telefone": {
      const digits = onlyPhoneDigits(key);
      const local =
        (digits.length === 12 || digits.length === 13) && digits.startsWith("55")
          ? digits.slice(2)
          : digits;
      return `+55${local}`;
    }
    case "Chave aleatória":
      return key.trim().toLowerCase();
    default:
      return key.trim();
  }
}

export function pixKeyErrorMessage(type: string | null | undefined) {
  if (isKnownPixKeyType(type)) {
    return `A chave Pix não é válida para o tipo ${type}. Confira se digitou corretamente.`;
  }
  return "Chave Pix inválida. Confira o valor ou selecione o tipo da chave.";
}
