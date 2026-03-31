import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ServiceRequestStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { transitionServiceRequestStatusAction } from "@/actions/service-requests";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

const queueOrder: ServiceRequestStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "SUBMITTED_TO_PARTNER",
  "RESOLVED",
];

type OperationsAfterSalesQueuePageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function OperationsAfterSalesQueuePage({
  searchParams,
}: OperationsAfterSalesQueuePageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "OPERATIONS" && session.user.role !== "ADMIN") {
    redirect("/403");
  }

  const requests = await prisma.serviceRequest.findMany({
    where: {
      status: { in: queueOrder },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      contractId: true,
      title: true,
      description: true,
      type: true,
      status: true,
      partnerReferenceNumber: true,
      createdAt: true,
      contract: {
        select: {
          id: true,
          client: { select: { firstName: true, lastName: true } },
          agent: { select: { name: true } },
        },
      },
    },
  });

  const byStatus = new Map<string, typeof requests>();
  for (const status of queueOrder) byStatus.set(status, []);
  for (const row of requests) byStatus.get(row.status)?.push(row);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Cola postventa</h1>
        <p className="text-sm text-slate-600">
          Ejecucion operativa de solicitudes de servicio por estado.
        </p>
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

      {queueOrder.map((status) => (
        <section key={status} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            {status} ({byStatus.get(status)?.length ?? 0})
          </h2>
          <div className="space-y-3">
            {(byStatus.get(status) ?? []).length === 0 && (
              <p className="text-sm text-slate-500">Sin solicitudes en este estado.</p>
            )}
            {(byStatus.get(status) ?? []).map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <Link
                    href={`/dashboard/contracts/${item.contractId}/after-sales`}
                    className="text-xs underline underline-offset-4"
                  >
                    Ver contrato
                  </Link>
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-wrap">{item.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-slate-600">
                  <span>Tipo: {item.type}</span>
                  <span>Agente: {item.contract.agent.name}</span>
                  <span>
                    Cliente: {item.contract.client.firstName} {item.contract.client.lastName}
                  </span>
                  <span>
                    Creada: {format(item.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                </div>
                <StatusBadge status={item.status} />

                {item.status === "OPEN" && (
                  <form action={transitionServiceRequestStatusAction} className="flex justify-end">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="targetStatus" value="IN_PROGRESS" />
                    <input type="hidden" name="redirectTo" value="/dashboard/operations/after-sales" />
                    <FormSubmitButton
                      idleText="Pasar a IN_PROGRESS"
                      pendingText="Actualizando..."
                    />
                  </form>
                )}

                {item.status === "IN_PROGRESS" && (
                  <form action={transitionServiceRequestStatusAction} className="space-y-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="targetStatus" value="SUBMITTED_TO_PARTNER" />
                    <input type="hidden" name="redirectTo" value="/dashboard/operations/after-sales" />
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Partner reference number
                      </label>
                      <input
                        name="partnerReferenceNumber"
                        required
                        defaultValue={item.partnerReferenceNumber ?? ""}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex justify-end">
                      <FormSubmitButton idleText="Enviar a partner" pendingText="Enviando..." />
                    </div>
                  </form>
                )}

                {item.status === "SUBMITTED_TO_PARTNER" && (
                  <form action={transitionServiceRequestStatusAction} className="flex justify-end">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="targetStatus" value="RESOLVED" />
                    <input type="hidden" name="redirectTo" value="/dashboard/operations/after-sales" />
                    <FormSubmitButton idleText="Marcar RESOLVED" pendingText="Actualizando..." />
                  </form>
                )}

                {item.status === "RESOLVED" && (
                  <form action={transitionServiceRequestStatusAction} className="flex justify-end">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="targetStatus" value="CLOSED" />
                    <input type="hidden" name="redirectTo" value="/dashboard/operations/after-sales" />
                    <FormSubmitButton
                      idleText="Cerrar (CLOSED)"
                      pendingText="Cerrando..."
                      variant="outline"
                    />
                  </form>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceRequestStatus }) {
  const className =
    status === "OPEN"
      ? "border-slate-300 bg-slate-100 text-slate-700"
      : status === "IN_PROGRESS"
        ? "border-blue-300 bg-blue-100 text-blue-700"
        : status === "SUBMITTED_TO_PARTNER"
          ? "border-amber-300 bg-amber-100 text-amber-800"
          : status === "RESOLVED"
            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
            : "border-slate-300 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}

