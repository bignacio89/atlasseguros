import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { canAgentEditOfferStatus } from "@/lib/offer-permissions";
import { OfferTimeline } from "@/components/offers/offer-timeline";
import {
  addOfferCommentAction,
  resubmitOfferAction,
  updateOfferAction,
} from "@/actions/offers";
import { Button } from "@/components/ui/button";

type OfferDetailPageProps = {
  params: { id: string };
};

export default async function OfferDetailPage({ params }: OfferDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      agentId: true,
      productId: true,
      status: true,
      premiumAmount: true,
      leadType: true,
      notes: true,
      createdAt: true,
      product: {
        select: {
          name: true,
          partner: { select: { name: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          authorRole: true,
          createdAt: true,
          author: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!offer) notFound();
  if (session.user.role === "AGENT" && offer.agentId !== session.user.id) {
    redirect("/403");
  }

  const canEditOffer =
    session.user.role !== "AGENT" || canAgentEditOfferStatus(offer.status);

  const products = canEditOffer
    ? await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          partner: { select: { name: true } },
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Oferta
        </h1>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Row
            label="Producto"
            value={`${offer.product.partner.name} — ${offer.product.name}`}
          />
          <Row label="Estado" value={offer.status} />
          <Row
            label="Prima"
            value={new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(offer.premiumAmount))}
          />
          <Row label="Tipo lead" value={offer.leadType} />
          <Row
            label="Creada"
            value={format(offer.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
          />
          <Row label="Notas" value={offer.notes ?? "—"} />
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Datos de oferta
        </h2>
        <form action={updateOfferAction} className="space-y-4">
          <input type="hidden" name="offerId" value={offer.id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Producto</label>
              <select
                name="productId"
                defaultValue={offer.productId}
                disabled={!canEditOffer}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm disabled:bg-slate-100"
              >
                {!canEditOffer && (
                  <option value="">
                    {offer.product.partner.name} — {offer.product.name}
                  </option>
                )}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.partner.name} — {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Prima (EUR)
              </label>
              <input
                name="premiumAmount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={Number(offer.premiumAmount)}
                disabled={!canEditOffer}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm disabled:bg-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Tipo lead</label>
              <select
                name="leadType"
                defaultValue={offer.leadType}
                disabled={!canEditOffer}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm disabled:bg-slate-100"
              >
                <option value="STANDARD">STANDARD</option>
                <option value="ATLAS">ATLAS</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Notas</label>
              <textarea
                name="notes"
                rows={4}
                defaultValue={offer.notes ?? ""}
                disabled={!canEditOffer}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!canEditOffer}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </section>

      <OfferTimeline comments={offer.comments} />

      {session.user.role === "AGENT" && offer.status === "REJECTED" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Reenviar a operaciones
          </h2>
          <form action={resubmitOfferAction} className="space-y-3">
            <input type="hidden" name="offerId" value={offer.id} />
            <textarea
              name="resubmitNote"
              rows={3}
              required
              placeholder="Describe cambios o aclaraciones para operaciones"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
            <div className="flex justify-end">
              <Button type="submit">Resubmit</Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Añadir comentario</h2>
        <form action={addOfferCommentAction} className="space-y-3">
          <input type="hidden" name="offerId" value={offer.id} />
          <textarea
            name="body"
            rows={4}
            required
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
          />
          <div className="flex justify-end">
            <Button type="submit">Publicar comentario</Button>
          </div>
        </form>
      </section>
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
