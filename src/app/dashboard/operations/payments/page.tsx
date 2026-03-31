import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { getPaymentStatus } from "@/services/payment.service";
import { retryPaymentAction } from "@/actions/payments";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type OperationsPaymentsPageProps = {
  searchParams: Promise<{ status?: "paid" | "pending" | "past_due"; type?: string; message?: string }>;
};

export default async function OperationsPaymentsPage({ searchParams }: OperationsPaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "OPERATIONS" && session.user.role !== "ADMIN") {
    redirect("/403");
  }

  const contracts = await prisma.contract.findMany({
    where: {
      offer: { product: { isConsultationFee: true } },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      premiumAmount: true,
      paymentPlan: true,
      updatedAt: true,
      client: { select: { id: true, firstName: true, lastName: true } },
      agent: { select: { name: true } },
    },
  });

  const withStatuses = await Promise.all(
    contracts.map(async (contract) => {
      const payment = await getPaymentStatus(contract.id);
      return { ...contract, payment };
    }),
  );

  const filtered = resolvedSearchParams.status
    ? withStatuses.filter((row) => row.payment.status === resolvedSearchParams.status)
    : withStatuses;

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Monitoreo de pagos</h1>
          <p className="text-sm text-slate-600">
            Seguimiento de contratos de consultation fee y estado proveedor.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <label htmlFor="status" className="text-xs font-medium text-slate-700">
            Estado
          </label>
          <select
            id="status"
            name="status"
            defaultValue={resolvedSearchParams.status ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="paid">paid</option>
            <option value="pending">pending</option>
            <option value="past_due">past_due</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Filtrar
          </button>
        </form>
      </section>

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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 px-3 text-left">Cliente</th>
              <th className="py-2 px-3 text-left">Agente</th>
              <th className="py-2 px-3 text-left">Importe</th>
              <th className="py-2 px-3 text-left">Plan</th>
              <th className="py-2 px-3 text-left">Estado</th>
              <th className="py-2 px-3 text-left">Última actualización</th>
              <th className="py-2 px-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 px-3 text-slate-500">
                  No hay contratos para el filtro seleccionado.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="py-2 px-3">
                  {row.client.firstName} {row.client.lastName}
                </td>
                <td className="py-2 px-3">{row.agent.name}</td>
                <td className="py-2 px-3">
                  {new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Number(row.premiumAmount))}
                </td>
                <td className="py-2 px-3">
                  {row.paymentPlan ?? "FULL"}
                </td>
                <td className="py-2 px-3">
                  <StatusBadge status={row.payment.status} />
                </td>
                <td className="py-2 px-3">
                  {format(row.updatedAt, "dd/MM/yyyy HH:mm", { locale: es })}
                </td>
                <td className="py-2 px-3">
                  {row.payment.status === "past_due" ? (
                    <form action={retryPaymentAction}>
                      <input type="hidden" name="contractId" value={row.id} />
                      <input
                        type="hidden"
                        name="returnPath"
                        value={`/dashboard/operations/payments${
                          resolvedSearchParams.status
                            ? `?status=${resolvedSearchParams.status}`
                            : ""
                        }`}
                      />
                      <FormSubmitButton idleText="Retry payment" pendingText="Retrying..." />
                    </form>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "paid" | "pending" | "past_due" | "cancelled" }) {
  const className =
    status === "paid"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
      : status === "pending"
        ? "border-slate-300 bg-slate-100 text-slate-700"
        : status === "past_due"
          ? "border-red-300 bg-red-100 text-red-800"
          : "border-slate-300 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}

