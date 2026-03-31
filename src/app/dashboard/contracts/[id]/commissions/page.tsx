import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import {
  recalculateContractCommissionsAction,
  runContractCommissionDryRunAction,
} from "@/actions/commissions";
import { Button } from "@/components/ui/button";

type ContractCommissionsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContractCommissionsPage({
  params,
}: ContractCommissionsPageProps) {
  const resolvedParams = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const contract = await prisma.contract.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      agentId: true,
      commissions: {
        orderBy: { calculatedAt: "desc" },
        select: {
          id: true,
          payoutAmount: true,
          differential: true,
          isOverride: true,
          isDryRun: true,
          status: true,
          calculatedAt: true,
          paidAt: true,
          notes: true,
          agent: { select: { name: true, email: true } },
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Comisiones</h2>
        {(session.user.role === "ADMIN" || session.user.role === "OPERATIONS") && (
          <div className="flex gap-2">
            <form action={runContractCommissionDryRunAction}>
              <input type="hidden" name="contractId" value={contract.id} />
              <Button type="submit" variant="outline">
                Dry-run
              </Button>
            </form>
            <form action={recalculateContractCommissionsAction}>
              <input type="hidden" name="contractId" value={contract.id} />
              <Button type="submit">Recalcular</Button>
            </form>
          </div>
        )}
      </div>
      {contract.commissions.length === 0 ? (
        <p className="text-sm text-slate-500">Sin comisiones calculadas para este contrato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2 text-left">Agente</th>
                <th className="py-2 text-left">Importe</th>
                <th className="py-2 text-left">Diferencial</th>
                <th className="py-2 text-left">Estado</th>
                <th className="py-2 text-left">Flags</th>
                <th className="py-2 text-left">Calculada</th>
                <th className="py-2 text-left">Pagada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {contract.commissions.map((row) => (
                <tr key={row.id}>
                  <td className="py-2">
                    {row.agent.name}
                    <span className="text-slate-500"> ({row.agent.email})</span>
                  </td>
                  <td className="py-2">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(Number(row.payoutAmount))}
                  </td>
                  <td className="py-2">
                    {row.differential
                      ? new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(Number(row.differential))
                      : "—"}
                  </td>
                  <td className="py-2">{row.status}</td>
                  <td className="py-2">
                    {row.isOverride ? "override " : ""}
                    {row.isDryRun ? "dry-run" : ""}
                    {!row.isOverride && !row.isDryRun ? "—" : ""}
                  </td>
                  <td className="py-2">
                    {format(row.calculatedAt, "dd/MM/yyyy HH:mm", { locale: es })}
                  </td>
                  <td className="py-2">
                    {row.paidAt ? format(row.paidAt, "dd/MM/yyyy HH:mm", { locale: es }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

