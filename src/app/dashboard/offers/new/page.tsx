import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { createOfferAction } from "@/actions/offers";
import { Button } from "@/components/ui/button";
import { OfferPaymentPlanFields } from "@/components/offers/OfferPaymentPlanFields";

export default async function NewOfferPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "AGENT") redirect("/403");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isConsultationFee: true,
      partner: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Nueva oferta</h1>
          <p className="text-sm text-slate-600">
            Completa los datos y envía la oferta a revisión de Operaciones.
          </p>
        </div>
        <Link href="/dashboard/offers" className="text-sm underline underline-offset-4">
          Volver al listado
        </Link>
      </section>

      <form action={createOfferAction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OfferPaymentPlanFields
            products={products.map((product) => ({
              id: product.id,
              label: `${product.partner.name} — ${product.name}`,
              isConsultationFee: product.isConsultationFee,
            }))}
          />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Tipo de lead</label>
            <select name="leadType" defaultValue="STANDARD" className={inputClass}>
              <option value="STANDARD">STANDARD</option>
              <option value="ATLAS">ATLAS</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Notas</label>
            <textarea name="notes" rows={4} className={inputClass} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Enviar a revisión</Button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900";

