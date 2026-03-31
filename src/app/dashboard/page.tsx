import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { getDownlineAgentIds } from "@/lib/get-downline-agent-ids";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  if (session.user.role === "ADMIN") {
    const [totalLeads, totalClients, activeContracts, pendingCommissions, premiumAgg, topAgentsRaw] =
      await Promise.all([
        prisma.lead.count(),
        prisma.client.count(),
        prisma.contract.count({ where: { status: "ACTIVE" } }),
        prisma.commissionRecord.count({ where: { status: "PENDING" } }),
        prisma.contract.aggregate({
          _sum: { premiumAmount: true },
        }),
        prisma.user.findMany({
          where: { role: "AGENT" },
          select: {
            id: true,
            name: true,
            email: true,
            contracts: {
              select: {
                premiumAmount: true,
              },
            },
          },
        }),
      ]);

    const topAgents = topAgentsRaw
      .map((agent) => {
        const premiumVolume = agent.contracts.reduce(
          (acc, contract) => acc + Number(contract.premiumAmount),
          0,
        );
        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          premiumVolume,
        };
      })
      .sort((a, b) => b.premiumVolume - a.premiumVolume)
      .slice(0, 5);

    return (
      <div className="space-y-8">
        <section>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Dashboard Administrador
          </h1>
          <p className="text-sm text-slate-600">
            Visión global de la operación y producción.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard label="Leads totales" value={String(totalLeads)} />
          <KpiCard label="Clientes totales" value={String(totalClients)} />
          <KpiCard label="Contratos activos" value={String(activeContracts)} />
          <KpiCard
            label="Volumen de primas"
            value={formatCurrency(Number(premiumAgg._sum.premiumAmount ?? 0))}
          />
          <KpiCard
            label="Comisiones pendientes"
            value={String(pendingCommissions)}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Top agentes por producción
          </h2>
          {topAgents.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay producción registrada todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 text-left">Agente</th>
                    <th className="py-2 text-left">Email</th>
                    <th className="py-2 text-right">Producción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {topAgents.map((agent) => (
                    <tr key={agent.id}>
                      <td className="py-2">{agent.name}</td>
                      <td className="py-2 text-slate-600">{agent.email}</td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(agent.premiumVolume)}
                      </td>
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

  if (session.user.role === "OPERATIONS") {
    const [
      offersPendingReview,
      offersSubmittedToPartner,
      contractsPendingActivation,
      openServiceRequests,
      failedStripePayments,
    ] = await Promise.all([
      prisma.offer.count({
        where: { status: "PENDING_OPERATIONS_REVIEW" },
      }),
      prisma.offer.count({
        where: { status: "SUBMITTED_TO_PARTNER" },
      }),
      prisma.offer.count({
        where: {
          status: "ACCEPTED",
          contract: null,
        },
      }),
      prisma.serviceRequest.count({
        where: {
          status: {
            in: ["OPEN", "IN_PROGRESS", "SUBMITTED_TO_PARTNER"],
          },
        },
      }),
      prisma.contract.count({
        where: {
          stripePaymentStatus: {
            in: ["failed", "requires_payment_method", "canceled"],
          },
        },
      }),
    ]);

    return (
      <div className="space-y-8">
        <section>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Dashboard Operaciones
          </h1>
          <p className="text-sm text-slate-600">
            Cola operativa para revisión, activación y seguimiento.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            label="Ofertas pendientes revisión"
            value={String(offersPendingReview)}
          />
          <KpiCard
            label="Ofertas enviadas a partner"
            value={String(offersSubmittedToPartner)}
          />
          <KpiCard
            label="Contratos pendientes activación"
            value={String(contractsPendingActivation)}
          />
          <KpiCard
            label="Solicitudes abiertas"
            value={String(openServiceRequests)}
          />
          <KpiCard
            label="Pagos Stripe fallidos"
            value={String(failedStripePayments)}
          />
        </section>
      </div>
    );
  }

  if (session.user.role === "AGENT") {
    const agentId = session.user.id;

    const [ownLeads, ownOffers, ownActiveContracts, ownPremiumAgg, rank, directDownlines] =
      await Promise.all([
        prisma.lead.count({ where: { agentId } }),
        prisma.offer.count({ where: { agentId } }),
        prisma.contract.count({
          where: { agentId, status: "ACTIVE" },
        }),
        prisma.contract.aggregate({
          where: { agentId },
          _sum: { premiumAmount: true },
        }),
        session.user.rankId
          ? prisma.rank.findUnique({
              where: { id: session.user.rankId },
              select: { id: true, name: true },
            })
          : Promise.resolve(null),
        prisma.user.findMany({
          where: {
            uplineId: agentId,
            role: "AGENT",
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        }),
      ]);

    const isManager = rank?.name === "FA1" || rank?.name === "DN";

    const downlineRows = isManager
      ? await Promise.all(
          directDownlines.map(async (direct) => {
            const recursiveIds = await getDownlineAgentIds(direct.id);
            const scopedAgentIds = [direct.id, ...recursiveIds];

            const [leadCount, offerCount, activeContractCount, premiumAgg] =
              await Promise.all([
                prisma.lead.count({
                  where: { agentId: { in: scopedAgentIds } },
                }),
                prisma.offer.count({
                  where: { agentId: { in: scopedAgentIds } },
                }),
                prisma.contract.count({
                  where: {
                    agentId: { in: scopedAgentIds },
                    status: "ACTIVE",
                  },
                }),
                prisma.contract.aggregate({
                  where: { agentId: { in: scopedAgentIds } },
                  _sum: { premiumAmount: true },
                }),
              ]);

            return {
              ...direct,
              leadCount,
              offerCount,
              activeContractCount,
              premiumVolume: Number(premiumAgg._sum.premiumAmount ?? 0),
            };
          }),
        )
      : [];

    return (
      <div className="space-y-8">
        <section>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Dashboard Agente
          </h1>
          <p className="text-sm text-slate-600">
            Resumen de tu pipeline comercial y cartera activa.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Mis leads" value={String(ownLeads)} />
          <KpiCard label="Mis ofertas" value={String(ownOffers)} />
          <KpiCard
            label="Mis contratos activos"
            value={String(ownActiveContracts)}
          />
          <KpiCard
            label="Mi volumen primas"
            value={formatCurrency(Number(ownPremiumAgg._sum.premiumAmount ?? 0))}
          />
        </section>

        {isManager && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              KPI agregado de downline directo
            </h2>
            {downlineRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                No tienes agentes directos asignados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 text-left">Agente</th>
                      <th className="py-2 text-left">Email</th>
                      <th className="py-2 text-right">Leads</th>
                      <th className="py-2 text-right">Ofertas</th>
                      <th className="py-2 text-right">Contratos activos</th>
                      <th className="py-2 text-right">Volumen primas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {downlineRows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2">{row.name}</td>
                        <td className="py-2 text-slate-600">{row.email}</td>
                        <td className="py-2 text-right">{row.leadCount}</td>
                        <td className="py-2 text-right">{row.offerCount}</td>
                        <td className="py-2 text-right">{row.activeContractCount}</td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(row.premiumVolume)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900 mb-2">
        Dashboard en construcción
      </h1>
      <p className="text-sm text-slate-600">
        Tu vista específica de rol se implementará en el siguiente paso.
      </p>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
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

