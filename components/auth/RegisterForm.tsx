"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { registerUser } from "@/lib/actions/auth";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import {
  authLabelClass,
  fieldClass,
  FieldError,
  FormAlert,
  SubmitButton,
} from "@/components/auth/auth-form-ui";

type RegisterFormProps = {
  errorCode?: string;
};

const errorMessages: Record<string, string> = {
  "email-exists": "Este e-mail já está cadastrado.",
  "google-account":
    "Este e-mail já está cadastrado com Google. Entre com Google.",
};

export function RegisterForm({ errorCode }: RegisterFormProps) {
  const [state, formAction, pending] = useActionState(
    registerUser,
    errorCode ? { error: errorCode } : {},
  );
  // Senha e confirmação são controladas para alimentar o checklist ao vivo.
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const nameError = state.fieldErrors?.name;
  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;
  const confirmError = state.fieldErrors?.confirmPassword;

  return (
    <form action={formAction} className="mt-6 grid gap-4" noValidate>
      {state.error ? (
        <FormAlert>
          {errorMessages[state.error] ?? "Não foi possível criar a conta."}
        </FormAlert>
      ) : null}

      {state.error === "email-exists" ? (
        <Link
          className="text-sm font-semibold text-leaf hover:text-leaf-hover"
          href="/verifique-seu-email"
        >
          Ainda não confirmou? Reenviar confirmação
        </Link>
      ) : null}

      <div className="grid gap-2">
        <label className={authLabelClass} htmlFor="name">
          Nome
        </label>
        <input
          className={fieldClass(Boolean(nameError))}
          id="name"
          name="name"
          type="text"
          maxLength={120}
          placeholder="Seu nome completo"
          required
          defaultValue={state.values?.name}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "name-error" : undefined}
        />
        {nameError ? <FieldError id="name-error">{nameError}</FieldError> : null}
      </div>

      <div className="grid gap-2">
        <label className={authLabelClass} htmlFor="email">
          E-mail
        </label>
        <input
          className={fieldClass(Boolean(emailError))}
          id="email"
          name="email"
          type="email"
          maxLength={160}
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
          minLength={8}
          maxLength={72}
          placeholder="Sua senha"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-error" : undefined}
        />
        {passwordError ? (
          <FieldError id="password-error">{passwordError}</FieldError>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className={authLabelClass} htmlFor="confirmPassword">
          Confirmar senha
        </label>
        <PasswordInput
          className={fieldClass(Boolean(confirmError))}
          id="confirmPassword"
          name="confirmPassword"
          minLength={8}
          maxLength={72}
          placeholder="Repita a senha"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={confirmError ? true : undefined}
          aria-describedby={confirmError ? "confirm-error" : undefined}
        />
        {confirmError ? (
          <FieldError id="confirm-error">{confirmError}</FieldError>
        ) : null}
      </div>

      <div className="rounded-lg border border-paper-soft bg-paper px-4 py-3">
        <PasswordChecklist
          password={password}
          confirmPassword={confirmPassword}
        />
      </div>

      <SubmitButton pending={pending} pendingLabel="Criando conta...">
        Criar conta
      </SubmitButton>
    </form>
  );
}
