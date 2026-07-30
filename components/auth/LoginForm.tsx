"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginWithCredentials } from "@/lib/actions/auth";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  authLabelClass,
  fieldClass,
  FieldError,
  FormAlert,
  SubmitButton,
} from "@/components/auth/auth-form-ui";

type LoginFormProps = {
  errorCode?: string;
};

const errorMessages: Record<string, string> = {
  "invalid-credentials": "E-mail ou senha incorretos.",
  "email-not-verified": "Confirme seu e-mail antes de entrar.",
  OAuthAccountNotLinked:
    "Este e-mail já está cadastrado com outro método de login.",
  auth: "Não foi possível entrar. Tente novamente.",
};

export function LoginForm({ errorCode }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    loginWithCredentials,
    errorCode ? { error: errorCode } : {},
  );
  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  return (
    <form action={formAction} className="mt-6 grid gap-4" noValidate>
      {state.error ? (
        <FormAlert>
          {errorMessages[state.error] ?? "Não foi possível entrar. Tente novamente."}
        </FormAlert>
      ) : null}

      {state.error === "email-not-verified" ? (
        <Link
          className="text-sm font-semibold text-leaf hover:text-leaf-hover"
          href="/verifique-seu-email"
        >
          Reenviar e-mail de confirmação
        </Link>
      ) : null}

      <div className="grid gap-2">
        <label className={authLabelClass} htmlFor="email">
          E-mail
        </label>
        <input
          className={fieldClass(Boolean(emailError))}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          required
          defaultValue={state.values?.email}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
        />
        {emailError ? (
          <FieldError id="email-error">{emailError}</FieldError>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className={authLabelClass} htmlFor="password">
          Senha
        </label>
        <PasswordInput
          className={fieldClass(Boolean(passwordError))}
          id="password"
          name="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-error" : undefined}
        />
        {passwordError ? (
          <FieldError id="password-error">{passwordError}</FieldError>
        ) : null}
      </div>

      <SubmitButton pending={pending} pendingLabel="Entrando...">
        Entrar
      </SubmitButton>
    </form>
  );
}
