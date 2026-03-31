import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { transitionContractFromActiveAction } from "@/actions/contracts";
import { Button } from "@/components/ui/button";

type ContractOverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContractOverviewPage({ params }: ContractOverviewPageProps) {
  const resolvedParams = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const contract = await prisma.contract.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      agentId: true,
      status: true,
      policyNumber: true,
      internalReference: true,
      policyIssuedAt: true,
      premiumAmount: true,
      points: true,
      leadType: true,
      startDate: true,
      endDate: true,
      client: { select: { firstName: true, lastName: true, email: true } },
      agent: { select: { name: true, email: true } },
    },
  });

  if (!contract) notFound();
  if (session.user.role === "AGENT" && contract.agentId !== session.user.id) {
    redirect("/403");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Resumen</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Row label="Estado" value={contract.status} />
          <Row label="Tipo lead" value={contract.leadType} />
          <Row label="Poliza" value={contract.policyNumber ?? "—"} />
          <Row label="Referencia interna" value={contract.internalReference ?? "—"} />
          <Row
            label="Prima"
            value={new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(contract.premiumAmount))}
          />
          <Row label="Puntos" value={Number(contract.points).toFixed(2)} />
          <Row
            label="Inicio"
            value={format(contract.startDate, "dd/MM/yyyy", { locale: es })}
          />
          <Row
            label="Fin"
            value={
              contract.endDate
                ? format(contract.endDate, "dd/MM/yyyy", { locale: es })
                : "—"
            }
          />
          <Row
            label="Poliza emitida"
            value={
              contract.policyIssuedAt
                ? format(contract.policyIssuedAt, "dd/MM/yyyy", { locale: es })
                : "—"
            }
          />
          <Row
            label="Cliente"
            value={`${contract.client.firstName} ${contract.client.lastName} (${contract.client.email})`}
          />
          <Row label="Agente" value={`${contract.agent.name} (${contract.agent.email})`} />
        </dl>
      </section>

      {session.user.role === "OPERATIONS" && contract.status === "ACTIVE" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Gestion de estado</h2>
          <form action={transitionContractFromActiveAction} className="space-y-3">
            <input type="hidden" name="contractId" value={contract.id} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Nuevo estado
                </label>
                <select
                  name="targetStatus"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  defaultValue="LAPSED"
                >
                  <option value="LAPSED">LAPSED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Motivo</label>
                <input
                  name="reason"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="outline">
                Actualizar estado
              </Button>
            </div>
          </form>
        </section>
      )}
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

