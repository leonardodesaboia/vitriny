import type { ReactNode } from "react";

export const labelClass = "text-sm font-semibold text-ink";

type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + hint wrapper used across the profile and catalog forms.
 * The control itself is passed as children so any input variant (text,
 * select, PhoneInput, textarea…) fits without special-casing.
 */
export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={`grid gap-2${className ? ` ${className}` : ""}`}>
      <label className={labelClass} htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
        {optional ? (
          <span className="font-normal text-ink-muted"> (opcional)</span>
        ) : null}
      </label>
      {children}
      {hint}
    </div>
  );
}
