"use client";

import { useState } from "react";

import { inputClass } from "@/components/provider-profile/profile-form-ui";
import { labelClass } from "@/components/ui/Field";
import { MAX_PROFILE_LINKS, type ProfileLink } from "@/lib/profile-links";

type Row = { key: string; label: string; url: string };

type ProfileLinksFieldsProps = {
  initialLinks?: ProfileLink[];
};

export function ProfileLinksFields({ initialLinks }: ProfileLinksFieldsProps) {
  const [rows, setRows] = useState<Row[]>(
    initialLinks && initialLinks.length > 0
      ? initialLinks.map((link, index) => ({
          key: `link-init-${index}`,
          label: link.label,
          url: link.url,
        }))
      : []
  );

  function updateRow(key: string, field: "label" | "url", value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((current) =>
      current.length >= MAX_PROFILE_LINKS
        ? current
        : [...current, { key: `link-${Date.now()}`, label: "", url: "" }]
    );
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <fieldset className="grid gap-3">
      <legend className={`${labelClass} mb-1`}>Outros links</legend>
      <p className="-mt-1 text-xs leading-5 text-ink-muted">
        Site, cardápio, WhatsApp, catálogo, canais… até {MAX_PROFILE_LINKS}.
        Todos opcionais.
      </p>

      {rows.map((row) => (
        <div
          className="grid gap-3 rounded-lg border border-paper-soft bg-white p-4 sm:grid-cols-[1fr_1.5fr_auto]"
          key={row.key}
        >
          <input
            aria-label="Rótulo do link"
            className={inputClass}
            maxLength={40}
            name="linkLabel"
            onChange={(e) => updateRow(row.key, "label", e.target.value)}
            placeholder="Ex: Cardápio"
            type="text"
            value={row.label}
          />
          <input
            aria-label="URL do link"
            className={inputClass}
            inputMode="url"
            name="linkUrl"
            onChange={(e) => updateRow(row.key, "url", e.target.value)}
            placeholder="https://…"
            type="text"
            value={row.url}
          />
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:border-red-300"
            onClick={() => removeRow(row.key)}
            type="button"
          >
            Remover
          </button>
        </div>
      ))}

      {rows.length < MAX_PROFILE_LINKS ? (
        <button
          className="inline-flex min-h-9 w-fit items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
          onClick={addRow}
          type="button"
        >
          + Adicionar link
        </button>
      ) : null}
    </fieldset>
  );
}
