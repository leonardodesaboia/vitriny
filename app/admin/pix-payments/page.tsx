import { listPendingProPixPayments } from "@/lib/actions/admin-pix-payments";
import { ConfirmProPixPaymentButton } from "@/components/admin/ConfirmProPixPaymentButton";

export default async function AdminPixPaymentsPage() {
  const payments = await listPendingProPixPayments();

  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8">
      <h1 className="font-fraunces text-3xl font-bold text-ink">
        Pagamentos Pix pendentes
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Assinantes que informaram pagamento da assinatura PRO via Pix.
        Confirme no seu banco antes de aprovar.
      </p>

      {payments.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Nenhum pagamento pendente.</p>
      ) : (
        <ul className="mt-8 divide-y divide-paper-soft rounded-xl border border-paper-soft bg-white">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{payment.businessName}</p>
                <p className="text-xs text-ink-muted">
                  R$ {payment.amount} · informado em{" "}
                  {payment.clientPaidAt.toLocaleDateString("pt-BR")}
                </p>
              </div>
              <ConfirmProPixPaymentButton paymentId={payment.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
