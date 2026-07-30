"use client";

// Requisitos de senha ao vivo (as regras reais: ≥8 caracteres e coincidência).
// Cada regra fica verde quando atendida, então o usuário sabe o que falta antes
// de enviar — em vez de descobrir por um erro genérico depois.
export function PasswordChecklist({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}) {
  const rules = [
    { label: "Pelo menos 8 caracteres", met: password.length >= 8 },
    {
      label: "As senhas coincidem",
      met: password.length > 0 && password === confirmPassword,
    },
  ];

  return (
    <ul className="grid gap-1.5" aria-live="polite">
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-2 text-xs transition-colors ${
            rule.met ? "font-medium text-leaf" : "text-ink-muted"
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
              rule.met
                ? "border-leaf bg-leaf text-white"
                : "border-paper-soft bg-white"
            }`}
          >
            {rule.met ? (
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              >
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
