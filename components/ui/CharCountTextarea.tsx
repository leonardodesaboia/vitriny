"use client";

import { useState, type TextareaHTMLAttributes } from "react";

type CharCountTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  maxLength: number;
};

// Textarea com contador de caracteres visível (X / máx). Usado nos campos
// grandes para o usuário ver quanto ainda pode escrever.
export function CharCountTextarea({
  maxLength,
  className,
  defaultValue,
  onChange,
  ...props
}: CharCountTextareaProps) {
  const [count, setCount] = useState(String(defaultValue ?? "").length);
  const atLimit = count >= maxLength;

  return (
    <div className="grid gap-1">
      <textarea
        {...props}
        className={className}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onChange={(e) => {
          setCount(e.target.value.length);
          onChange?.(e);
        }}
      />
      <p
        aria-live="polite"
        className={`text-right text-xs tabular-nums ${
          atLimit ? "font-semibold text-amber" : "text-ink-muted"
        }`}
      >
        {count} / {maxLength}
      </p>
    </div>
  );
}
