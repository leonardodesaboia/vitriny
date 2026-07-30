"use client";

import { useActionState, useState } from "react";

import { resetPassword } from "@/lib/actions/auth";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import {
  authLabelClass,
  fieldClass,
  FieldError,
  FormAlert,
  SubmitButton,
} from "@/components/auth/auth-form-ui";

type ResetPasswordFormProps = {
  token: string;
  errorCode?: string;
};

export function ResetPasswordForm({ token, errorCode }: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    resetPassword,
    errorCode ? { error: errorCode } : {},
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordError = state.fieldErrors?.password;
  const confirmError = state.fieldErrors?.confirmPassword;

  return (
    <form action={formAction} className="mt-6 grid gap-4" noValidate>
      <input name="token" type="hidden" value={token} />

      {state.error ? (
        <FormAlert>Não foi possível redefinir a senha.</FormAlert>
      ) : null}

      <div className="grid gap-2">
        <label className={authLabelClass} htmlFor="password">
          Nova senha
        </label>
        <PasswordInput
          className={fieldClass(Boolean(passwordError))}
          id="password"
          name="password"
          minLength={8}
          maxLength={72}
          placeholder="Sua nova senha"
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
          Confirmar nova senha
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

      <SubmitButton pending={pending} pendingLabel="Redefinindo...">
        Redefinir senha
      </SubmitButton>
    </form>
  );
}
