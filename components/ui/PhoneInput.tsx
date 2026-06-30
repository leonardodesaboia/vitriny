"use client";

import { usePhoneInput } from "@/hooks/usePhoneInput";

type PhoneInputProps = {
  name: string;
  id?: string;
  defaultValue?: string | null;
  className?: string;
  required?: boolean;
};

export function PhoneInput({
  name,
  id,
  defaultValue,
  className,
  required
}: PhoneInputProps) {
  const { inputProps, submitValue } = usePhoneInput(defaultValue ?? "");

  return (
    <>
      <input name={name} required={required} type="hidden" value={submitValue} />
      <input {...inputProps} className={className} id={id} type="tel" />
    </>
  );
}
