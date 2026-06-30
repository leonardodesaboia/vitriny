export type InvoiceItem = {
  id: string;
  created: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  hostedUrl: string | null;
};

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amount / 100);
}

export function InvoiceList({ invoices }: { invoices: InvoiceItem[] }) {
  return (
    <section className="mt-6 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Faturas
      </p>

      {invoices.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Nenhuma fatura encontrada.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-paper-soft">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {formatDate(invoice.created)}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {formatAmount(invoice.amountPaid, invoice.currency)}
                </p>
              </div>
              {invoice.hostedUrl ? (
                <a
                  href={invoice.hostedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-8 items-center justify-center rounded-md border border-paper-soft bg-white px-3 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                >
                  Ver fatura
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
