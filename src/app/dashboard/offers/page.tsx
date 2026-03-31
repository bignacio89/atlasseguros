import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";

export default async function OffersPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const where =
    session.user.role === "AGENT"
      ? { agentId: session.user.id }
      : {};

  const offers = await prisma.offer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      premiumAmount: true,
      leadType: true,
      createdAt: true,
      product: {
        select: { name: true, partner: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Ofertas</h1>
          <p className="text-sm text-slate-600">
            Seguimiento de ofertas y estado de validación.
          </p>
        </div>
        {session.user.role === "AGENT" && (
          <Link href="/dashboard/offers/new" className="text-sm underline underline-offset-4">
            Nueva oferta
          </Link>
        )}
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 px-3 text-left">Producto</th>
              <th className="py-2 px-3 text-left">Tipo lead</th>
              <th className="py-2 px-3 text-left">Prima</th>
              <th className="py-2 px-3 text-left">Estado</th>
              <th className="py-2 px-3 text-left">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {offers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 px-3 text-slate-500">
                  No hay ofertas registradas.
                </td>
              </tr>
            )}
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td className="py-2 px-3">
                  {offer.product.partner.name} — {offer.product.name}
                </td>
                <td className="py-2 px-3">{offer.leadType}</td>
                <td className="py-2 px-3">
                  {new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Number(offer.premiumAmount))}
                </td>
                <td className="py-2 px-3">{offer.status}</td>
                <td className="py-2 px-3">
                  <Link
                    href={`/offers/${offer.id}`}
                    className="underline underline-offset-4"
                  >
                    {format(offer.createdAt, "dd/MM/yyyy", { locale: es })}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

