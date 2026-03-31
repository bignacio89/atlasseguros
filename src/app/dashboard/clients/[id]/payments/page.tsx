import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { createPortalSessionAction, retryPaymentAction } from "@/actions/payments";
import { getInstallments, getPaymentStatus } from "@/services/payment.service";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type ClientPaymentsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function ClientPaymentsPage({
  params,
  searchParams,
}: ClientPaymentsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const client = await prisma.client.findUnique({
    where: { id: resolvedParams.id },
    select: { id: true, agentId: true },
  });
  if (!client) notFound();
  if (session.user.role === "AGENT" && client.agentId !== session.user.id) {
    redirect("/403");
  }

  const contract = await prisma.contract.findFirst({
    where: {
      clientId: client.id,
      offer: { product: { isConsultationFee: true } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      premiumAmount: true,
      paymentPlan: true,
    },
  });

  if (!contract) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Pagos</h2>
        <p className="text-sm text-slate-600">
          Este cliente no tiene contratos de consulta con pago online.
        </p>
      </section>
    );
  }

  const [paymentStatus, installments] = await Promise.all([
    getPaymentStatus(contract.id),
    getInstallments(contract.id),
  ]);

  return (
    <div className="space-y-4">
      {resolvedSearchParams.message && (
        <section
          className={`rounded-xl border px-4 py-3 text-sm ${
            resolvedSearchParams.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {resolvedSearchParams.message}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Resumen de plan</h2>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Row label="Tipo" value={contract.paymentPlan ?? "FULL"} />
          <Row
            label="Importe total"
            value={new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(contract.premiumAmount))}
          />
          <Row
            label="Estado proveedor"
            value={`${paymentStatus.status.toUpperCase()} (${paymentStatus.provider})`}
          />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          {paymentStatus.status === "past_due" && (
            <form action={retryPaymentAction}>
              <input type="hidden" name="contractId" value={contract.id} />
              <input
                type="hidden"
                name="returnPath"
                value={`/dashboard/clients/${client.id}/payments`}
              />
              <FormSubmitButton idleText="Retry payment" pendingText="Retrying..." />
            </form>
          )}
          <form action={createPortalSessionAction}>
            <input type="hidden" name="contractId" value={contract.id} />
            <input type="hidden" name="returnPath" value={`/dashboard/clients/${client.id}/payments`} />
            <FormSubmitButton
              idleText="Manage payment method"
              pendingText="Opening portal..."
              variant="outline"
            />
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Cuotas</h2>
        {installments.length === 0 ? (
          <p className="text-sm text-slate-600">
            No hay cuotas registradas para este contrato (stub provider).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 text-left">Nº</th>
                  <th className="py-2 text-left">Importe</th>
                  <th className="py-2 text-left">Vencimiento</th>
                  <th className="py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {installments.map((item) => (
                  <tr key={item.providerReference}>
                    <td className="py-2">{item.installmentNumber}</td>
                    <td className="py-2">
                      {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(item.amount)}
                    </td>
                    <td className="py-2">
                      {format(item.dueDate, "dd/MM/yyyy", { locale: es })}
                    </td>
                    <td className="py-2">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  );
}

