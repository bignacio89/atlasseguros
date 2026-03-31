import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";

export default async function ContractsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const where = session.user.role === "AGENT" ? { agentId: session.user.id } : {};

  const contracts = await prisma.contract.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      policyNumber: true,
      internalReference: true,
      premiumAmount: true,
      createdAt: true,
      client: { select: { firstName: true, lastName: true } },
      agent: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Contratos</h1>
        <p className="text-sm text-slate-600">
          Cartera de contratos con acceso a detalle, comisiones y postventa.
        </p>
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 px-3 text-left">Cliente</th>
              <th className="py-2 px-3 text-left">Agente</th>
              <th className="py-2 px-3 text-left">Estado</th>
              <th className="py-2 px-3 text-left">Poliza</th>
              <th className="py-2 px-3 text-left">Ref. interna</th>
              <th className="py-2 px-3 text-left">Prima</th>
              <th className="py-2 px-3 text-left">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {contracts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 px-3 text-slate-500">
                  No hay contratos registrados.
                </td>
              </tr>
            )}
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td className="py-2 px-3">
                  <Link
                    href={`/dashboard/contracts/${contract.id}`}
                    className="underline underline-offset-4"
                  >
                    {contract.client.firstName} {contract.client.lastName}
                  </Link>
                </td>
                <td className="py-2 px-3">{contract.agent.name}</td>
                <td className="py-2 px-3">{contract.status}</td>
                <td className="py-2 px-3">{contract.policyNumber ?? "—"}</td>
                <td className="py-2 px-3">{contract.internalReference ?? "—"}</td>
                <td className="py-2 px-3">
                  {new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Number(contract.premiumAmount))}
                </td>
                <td className="py-2 px-3">
                  {format(contract.createdAt, "dd/MM/yyyy", { locale: es })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

