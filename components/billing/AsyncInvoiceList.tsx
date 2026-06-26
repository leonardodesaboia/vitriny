"use client";

import { useEffect, useState } from "react";

import { InvoiceList, type InvoiceItem } from "@/components/billing/InvoiceList";

type InvoiceResponse = {
  invoices?: InvoiceItem[];
  error?: string;
};

export function AsyncInvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInvoices() {
      try {
        const res = await fetch("/api/billing/invoices");
        const data = (await res.json()) as InvoiceResponse;

        if (!active) return;

        if (!res.ok) {
          setError(data.error ?? "Não foi possível carregar as faturas.");
          return;
        }

        setInvoices(data.invoices ?? []);
      } catch {
        if (active) setError("Não foi possível carregar as faturas.");
      }
    }

    void loadInvoices();

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">
          Faturas
        </p>
        <p className="mt-3 text-sm font-semibold text-amber-800">{error}</p>
      </section>
    );
  }

  if (!invoices) {
    return (
      <section className="mt-6 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
          Faturas
        </p>
        <p className="mt-4 text-sm text-ink-muted">Carregando faturas...</p>
      </section>
    );
  }

  return <InvoiceList invoices={invoices} />;
}
