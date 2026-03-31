import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { createInvitation } from "@/services/invitation.service";
import { Button } from "@/components/ui/button";

export default async function AdminInvitationsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/403");
  }

  const [ranks, agents, invitations] = await Promise.all([
    prisma.rank.findMany({
      orderBy: { levelOrder: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        rank: true,
        upline: {
          select: { id: true, name: true, email: true },
        },
      },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Invitaciones de usuario
        </h1>
        <p className="text-sm text-slate-600">
          Crea nuevas invitaciones para agentes, operaciones o administradores.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Nueva invitación
        </h2>
        <Suspense fallback={null}>
          <InvitationForm
            ranks={ranks}
            agents={agents}
            invitedById={session.user.id}
          />
        </Suspense>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Invitaciones recientes
        </h2>
        <InvitationTable invitations={invitations} />
      </section>
    </div>
  );
}

type InvitationFormProps = {
  ranks: { id: string; name: string }[];
  agents: { id: string; name: string | null; email: string }[];
  invitedById: string;
};

function InvitationForm({ ranks, agents, invitedById }: InvitationFormProps) {
  async function handleInvite(formData: FormData) {
    "use server";

    const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
    const role = formData.get("role")?.toString() as
      | "ADMIN"
      | "OPERATIONS"
      | "AGENT";
    const rankIdRaw = formData.get("rankId")?.toString() ?? "";
    const uplineIdRaw = formData.get("uplineId")?.toString() ?? "";

    await createInvitation({
      email,
      role,
      rankId: role === "AGENT" && rankIdRaw ? rankIdRaw : null,
      uplineId: role === "AGENT" && uplineIdRaw ? uplineIdRaw : null,
      invitedById,
    });
  }

  return (
    <form action={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Correo electrónico
        </label>
        <input
          name="email"
          type="email"
          required
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Rol
        </label>
        <select
          name="role"
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
          defaultValue="AGENT"
        >
          <option value="AGENT">Agente</option>
          <option value="OPERATIONS">Operaciones</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Rango (solo agentes)
        </label>
        <select
          name="rankId"
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
        >
          <option value="">—</option>
          {ranks.map((rank) => (
            <option key={rank.id} value={rank.id}>
              {rank.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Upline (solo agentes)
        </label>
        <select
          name="uplineId"
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
        >
          <option value="">—</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name ?? agent.email}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-4 flex justify-end">
        <Button type="submit">Enviar invitación</Button>
      </div>
    </form>
  );
}

type InvitationTableProps = {
  invitations: Awaited<ReturnType<typeof prisma.invitation.findMany>>;
};

function InvitationTable({ invitations }: InvitationTableProps) {
  if (!invitations.length) {
    return (
      <p className="text-sm text-slate-500">
        Todavía no se han enviado invitaciones.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
          <tr>
            <th className="py-2 text-left">Correo</th>
            <th className="py-2 text-left">Rol</th>
            <th className="py-2 text-left">Rango</th>
            <th className="py-2 text-left">Upline</th>
            <th className="py-2 text-left">Estado</th>
            <th className="py-2 text-left">Creada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {invitations.map((inv) => (
            <tr key={inv.id}>
              <td className="py-2">{inv.email}</td>
              <td className="py-2">{inv.role}</td>
              <td className="py-2">
                {inv.rank ? inv.rank.name : "—"}
              </td>
              <td className="py-2">
                {inv.upline ? inv.upline.name : "—"}
              </td>
              <td className="py-2">
                <StatusBadge status={inv.status} />
              </td>
              <td className="py-2 text-slate-500">
                {inv.createdAt.toLocaleString("es-ES")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "CLAIMED" | "EXPIRED" }) {
  const styles: Record<
    typeof status,
    { label: string; className: string }
  > = {
    PENDING: {
      label: "Pendiente",
      className:
        "bg-amber-50 text-amber-800 border border-amber-200",
    },
    CLAIMED: {
      label: "Reclamada",
      className:
        "bg-emerald-50 text-emerald-800 border border-emerald-200",
    },
    EXPIRED: {
      label: "Expirada",
      className:
        "bg-slate-50 text-slate-700 border border-slate-200",
    },
  };

  const style = styles[status];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

