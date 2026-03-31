import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";

type CommissionsPageProps = {
  searchParams: Promise<{ agentId?: string }>;
};

export default async function CommissionsPage({ searchParams }: CommissionsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const resolvedSearchParams = await searchParams;
  const selectedAgentId =
    session.user.role === "AGENT" ? session.user.id : resolvedSearchParams.agentId;

  const where = {
    ...(selectedAgentId ? { agentId: selectedAgentId } : {}),
  };

  const [records, agents] = await Promise.all([
    prisma.commissionRecord.findMany({
      where,
      orderBy: { calculatedAt: "desc" },
      select: {
        id: true,
        contractId: true,
        payoutAmount: true,
        differential: true,
        isOverride: true,
        isDryRun: true,
        status: true,
        calculatedAt: true,
        paidAt: true,
        agent: { select: { id: true, name: true, email: true } },
      },
    }),
    session.user.role === "AGENT"
      ? Promise.resolve([])
      : prisma.user.findMany({
          where: { role: "AGENT" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        }),
  ]);

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Comisiones</h1>
          <p className="text-sm text-slate-600">
            Listado de liquidaciones por agente y contrato.
          </p>
        </div>

        {session.user.role !== "AGENT" && (
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="agentId" className="text-xs font-medium text-slate-700">
              Agente
            </label>
            <select
              id="agentId"
              name="agentId"
              defaultValue={selectedAgentId ?? ""}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.email})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Filtrar
            </button>
          </form>
        )}
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 px-3 text-left">Agente</th>
              <th className="py-2 px-3 text-left">Contrato</th>
              <th className="py-2 px-3 text-left">Importe</th>
              <th className="py-2 px-3 text-left">Diferencial</th>
              <th className="py-2 px-3 text-left">Estado</th>
              <th className="py-2 px-3 text-left">Flags</th>
              <th className="py-2 px-3 text-left">Calculada</th>
              <th className="py-2 px-3 text-left">Pagada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 px-3 text-slate-500">
                  No hay comisiones para el filtro actual.
                </td>
              </tr>
            )}
            {records.map((row) => (
              <tr key={row.id}>
                <td className="py-2 px-3">
                  {row.agent.name}
                  <span className="text-slate-500"> ({row.agent.email})</span>
                </td>
                <td className="py-2 px-3">
                  <Link
                    href={`/dashboard/contracts/${row.contractId}/commissions`}
                    className="underline underline-offset-4"
                  >
                    {row.contractId}
                  </Link>
                </td>
                <td className="py-2 px-3">{formatCurrency(Number(row.payoutAmount))}</td>
                <td className="py-2 px-3">
                  {row.differential ? formatCurrency(Number(row.differential)) : "—"}
                </td>
                <td className="py-2 px-3">{row.status}</td>
                <td className="py-2 px-3">
                  {row.isOverride ? "override " : ""}
                  {row.isDryRun ? "dry-run" : ""}
                  {!row.isOverride && !row.isDryRun ? "—" : ""}
                </td>
                <td className="py-2 px-3">
                  {format(row.calculatedAt, "dd/MM/yyyy HH:mm", { locale: es })}
                </td>
                <td className="py-2 px-3">
                  {row.paidAt ? format(row.paidAt, "dd/MM/yyyy HH:mm", { locale: es }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

