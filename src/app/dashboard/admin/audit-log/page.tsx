import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";

type AdminAuditLogPageProps = {
  searchParams: Promise<{
    entity?: string;
    action?: string;
    actor?: string;
    from?: string;
    to?: string;
  }>;
};

const entities = ["CONTRACT", "OFFER", "COMMISSION_RECORD"] as const;
const actions = ["CREATED", "STATUS_CHANGED", "AMOUNT_CHANGED", "CANCELLED", "RECALCULATED"] as const;

export default async function AdminAuditLogPage({ searchParams }: AdminAuditLogPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "ADMIN") redirect("/403");

  const from = resolvedSearchParams.from ? new Date(resolvedSearchParams.from) : null;
  const to = resolvedSearchParams.to ? new Date(resolvedSearchParams.to) : null;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(resolvedSearchParams.entity ? { entity: resolvedSearchParams.entity as never } : {}),
      ...(resolvedSearchParams.action ? { action: resolvedSearchParams.action as never } : {}),
      ...(resolvedSearchParams.actor
        ? {
            OR: [
              { actorId: { contains: resolvedSearchParams.actor } },
              { actorType: { contains: resolvedSearchParams.actor } },
            ],
          }
        : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 mb-2 dark:text-slate-100">AuditLog</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Visor maestro de trazabilidad. Últimos 300 eventos según filtro.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <form method="get" className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <select name="entity" defaultValue={resolvedSearchParams.entity ?? ""} className={inputClass}>
            <option value="">Entidad (todas)</option>
            {entities.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
          <select name="action" defaultValue={resolvedSearchParams.action ?? ""} className={inputClass}>
            <option value="">Acción (todas)</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <input
            name="actor"
            defaultValue={resolvedSearchParams.actor ?? ""}
            placeholder="actorId o actorType"
            className={inputClass}
          />
          <input name="from" type="date" defaultValue={resolvedSearchParams.from ?? ""} className={inputClass} />
          <input name="to" type="date" defaultValue={resolvedSearchParams.to ?? ""} className={inputClass} />
          <div className="md:col-span-5 flex justify-end">
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Aplicar filtros
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="py-2 text-left">Fecha</th>
                <th className="py-2 text-left">Entidad</th>
                <th className="py-2 text-left">EntityId</th>
                <th className="py-2 text-left">Acción</th>
                <th className="py-2 text-left">Actor</th>
                <th className="py-2 text-left">Prev</th>
                <th className="py-2 text-left">New</th>
                <th className="py-2 text-left">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-200">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-slate-500 dark:text-slate-400">
                    No hay eventos para el filtro actual.
                  </td>
                </tr>
              )}
              {logs.map((row) => (
                <tr key={row.id}>
                  <td className="py-2">
                    {format(row.createdAt, "dd/MM/yyyy HH:mm:ss", { locale: es })}
                  </td>
                  <td className="py-2">{row.entity}</td>
                  <td className="py-2">{row.entityId}</td>
                  <td className="py-2">{row.action}</td>
                  <td className="py-2">
                    {row.actorType}
                    {row.actorId ? ` (${row.actorId})` : ""}
                  </td>
                  <td className="py-2 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                    {row.previousValue ? JSON.stringify(row.previousValue) : "—"}
                  </td>
                  <td className="py-2 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                    {row.newValue ? JSON.stringify(row.newValue) : "—"}
                  </td>
                  <td className="py-2 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                    {row.metadata ? JSON.stringify(row.metadata) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-300 dark:focus:border-slate-300";

