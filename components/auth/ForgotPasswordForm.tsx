"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@/lib/actions/auth";
import {
  authLabelClass,
  fieldClass,
  FieldError,
  FormAlert,
  SubmitButton,
} from "@/components/auth/auth-form-ui";

type ForgotPasswordFormProps = {
  errorCode?: string;
};

export function ForgotPasswordForm({ errorCode }: ForgotPasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    errorCode ? { error: errorCode } : {},
  );
  const emailError = state.fieldErrors?.email;

  return (
    <form action={formAction} className="mt-6 grid gap-4" noValidate>
      {state.error ? (
        <FormAlert>Não foi possível processar o pedido.</FormAlert>
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

      <SubmitButton pending={pending} pendingLabel="Enviando...">
        Enviar link de redefinição
      </SubmitButton>
    </form>
  );
}
