import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { archiveClientAction } from "@/actions/clients";

type ClientOverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientOverviewPage({ params }: ClientOverviewPageProps) {
  const resolvedParams = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const client = await prisma.client.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      agentId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      nif: true,
      address: true,
      city: true,
      postalCode: true,
    },
  });

  if (!client) notFound();
  if (session.user.role === "AGENT" && client.agentId !== session.user.id) {
    redirect("/403");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Resumen</h2>
        <form action={archiveClientAction}>
          <input type="hidden" name="clientId" value={client.id} />
          <button
            type="submit"
            className="text-sm underline underline-offset-4 text-red-700"
          >
            Archivar cliente
          </button>
        </form>
      </div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <Row label="Nombre" value={`${client.firstName} ${client.lastName}`} />
        <Row label="Email" value={client.email} />
        <Row label="Teléfono" value={client.phone ?? "—"} />
        <Row label="NIF" value={client.nif ?? "—"} />
        <Row label="Dirección" value={client.address ?? "—"} />
        <Row label="Ciudad" value={client.city ?? "—"} />
        <Row label="Código postal" value={client.postalCode ?? "—"} />
      </dl>
    </section>
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

