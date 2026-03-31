import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { archiveClientAction } from "@/actions/clients";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const where =
    session.user.role === "AGENT"
      ? { agentId: session.user.id }
      : {};

  const clients = await prisma.client.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      city: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Clientes</h1>
        <p className="text-sm text-slate-600">
          Listado de clientes con acceso a ficha individual.
        </p>
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 px-3 text-left">Nombre</th>
              <th className="py-2 px-3 text-left">Email</th>
              <th className="py-2 px-3 text-left">Teléfono</th>
              <th className="py-2 px-3 text-left">Ciudad</th>
              <th className="py-2 px-3 text-left">Alta</th>
              <th className="py-2 px-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 px-3 text-slate-500">
                  No hay clientes registrados.
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="py-2 px-3">
                  {client.firstName} {client.lastName}
                </td>
                <td className="py-2 px-3">{client.email}</td>
                <td className="py-2 px-3">{client.phone ?? "—"}</td>
                <td className="py-2 px-3">{client.city ?? "—"}</td>
                <td className="py-2 px-3">
                  {format(client.createdAt, "dd/MM/yyyy", { locale: es })}
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="text-sm underline underline-offset-4"
                    >
                      Ver ficha
                    </Link>
                    <form action={archiveClientAction}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <button
                        type="submit"
                        className="text-sm underline underline-offset-4 text-red-700"
                      >
                        Archivar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

