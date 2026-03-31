import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ServiceRequestStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import {
  createServiceRequestAction,
  deleteServiceRequestAction,
  updateServiceRequestAction,
} from "@/actions/service-requests";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type ContractAfterSalesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function ContractAfterSalesPage({
  params,
  searchParams,
}: ContractAfterSalesPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const contract = await prisma.contract.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      agentId: true,
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          title: true,
          description: true,
          partnerReferenceNumber: true,
          createdAt: true,
          resolvedAt: true,
        },
      },
    },
  });

  if (!contract) notFound();
  if (session.user.role === "AGENT" && contract.agentId !== session.user.id) {
    redirect("/403");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Postventa</h2>
      {resolvedSearchParams.message && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            resolvedSearchParams.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {resolvedSearchParams.message}
        </div>
      )}
      {session.user.role !== "AGENT" && (
        <form action={createServiceRequestAction} className="mb-6 space-y-3">
          <input type="hidden" name="contractId" value={contract.id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Tipo</label>
              <select
                name="type"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                defaultValue="INQUIRY"
              >
                <option value="INQUIRY">INQUIRY</option>
                <option value="MODIFICATION">MODIFICATION</option>
                <option value="CANCELLATION">CANCELLATION</option>
                <option value="CLAIM">CLAIM</option>
                <option value="RENEWAL">RENEWAL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Titulo</label>
              <input
                name="title"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Descripcion</label>
            <textarea
              name="description"
              rows={3}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <FormSubmitButton idleText="Crear solicitud" pendingText="Creando..." />
          </div>
        </form>
      )}

      {contract.serviceRequests.length === 0 ? (
        <p className="text-sm text-slate-500">No hay solicitudes de postventa abiertas.</p>
      ) : (
        <div className="space-y-3">
          {contract.serviceRequests.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              {session.user.role === "AGENT" ? (
                <>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{item.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                    <span>Tipo: {item.type}</span>
                    <span>
                      Estado: <StatusBadge status={item.status} />
                    </span>
                    <span>
                      Ref partner: {item.partnerReferenceNumber ?? "—"}
                    </span>
                  </div>
                </>
              ) : (
                <form action={updateServiceRequestAction} className="space-y-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="contractId" value={contract.id} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Tipo</label>
                      <select
                        name="type"
                        defaultValue={item.type}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="INQUIRY">INQUIRY</option>
                        <option value="MODIFICATION">MODIFICATION</option>
                        <option value="CANCELLATION">CANCELLATION</option>
                        <option value="CLAIM">CLAIM</option>
                        <option value="RENEWAL">RENEWAL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Titulo</label>
                      <input
                        name="title"
                        defaultValue={item.title}
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Descripcion
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={item.description}
                      required
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                        Estado: <StatusBadge status={item.status} /> · Creada:{" "}
                      {format(item.createdAt, "dd/MM/yyyy HH:mm", { locale: es })} · Resuelta:{" "}
                      {item.resolvedAt
                        ? format(item.resolvedAt, "dd/MM/yyyy HH:mm", { locale: es })
                        : "—"}
                    </p>
                    <div className="flex gap-2">
                        <FormSubmitButton
                          idleText="Guardar"
                          pendingText="Guardando..."
                          variant="outline"
                        />
                    </div>
                  </div>
                </form>
              )}

              {session.user.role !== "AGENT" && (
                <form action={deleteServiceRequestAction} className="flex justify-end">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="contractId" value={contract.id} />
                  <button
                    type="submit"
                    className="text-sm underline underline-offset-4 text-red-700"
                  >
                    Eliminar
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {status}
    </span>
  );
}

