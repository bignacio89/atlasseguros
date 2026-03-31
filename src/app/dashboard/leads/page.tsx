import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { LeadsTable } from "@/components/leads/LeadsTable";
import Link from "next/link";

export default async function LeadsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const leadWhere =
    session.user.role === "AGENT"
      ? { agentId: session.user.id }
      : {};

  const [leads, agents] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        leadType: true,
        agentId: true,
        createdAt: true,
        clientId: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const agentById = new Map(agents.map((agent) => [agent.id, agent]));

  const rows = leads.map((lead) => ({
    ...lead,
    agentName: agentById.get(lead.agentId)?.name ?? null,
    createdAt: format(lead.createdAt, "dd/MM/yyyy", { locale: es }),
  }));

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Leads</h1>
          <p className="text-sm text-slate-600">
            Listado de leads con filtros por tipo y agente.
          </p>
        </div>
        <Link href="/dashboard/leads/new" className="text-sm underline underline-offset-4">
          Nuevo lead
        </Link>
      </section>

      <LeadsTable role={session.user.role} data={rows} agentOptions={agents} />
    </div>
  );
}

