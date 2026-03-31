import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { redirect } from "next/navigation";

import {
  activateContractFromOfferAction,
  approveOfferAction,
  rejectOfferAction,
} from "@/actions/offers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { Button } from "@/components/ui/button";

export default async function OperationsOffersQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "OPERATIONS" && session.user.role !== "ADMIN") {
    redirect("/403");
  }

  const pendingOffers = await prisma.offer.findMany({
    where: { status: "PENDING_OPERATIONS_REVIEW" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      premiumAmount: true,
      leadType: true,
      agent: { select: { name: true, email: true } },
      product: {
        select: {
          name: true,
          partner: { select: { name: true } },
        },
      },
    },
  });

  const submittedOffers = await prisma.offer.findMany({
    where: { status: "SUBMITTED_TO_PARTNER" },
    orderBy: { submittedToPartnerAt: "asc" },
    select: {
      id: true,
      submittedToPartnerAt: true,
      premiumAmount: true,
      leadType: true,
      client: { select: { firstName: true, lastName: true, email: true } },
      product: {
        select: {
          name: true,
          partner: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Cola de validacion de ofertas
          </h1>
          <p className="text-sm text-slate-600">
            Tab 1: pendientes de revision por operaciones.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Pending review ({pendingOffers.length})
        </h2>
        <div className="space-y-4">
          {pendingOffers.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay ofertas pendientes de revision.
            </p>
          )}

          {pendingOffers.map((offer) => (
            <article
              key={offer.id}
              className="rounded-xl border border-slate-200 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {offer.product.partner.name} - {offer.product.name}
                </p>
                <Link
                  href={`/offers/${offer.id}`}
                  className="text-xs underline underline-offset-4"
                >
                  Ver detalle
                </Link>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                <Row label="Agente" value={offer.agent.name} />
                <Row label="Email agente" value={offer.agent.email} />
                <Row label="Lead type" value={offer.leadType} />
                <Row
                  label="Prima"
                  value={new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Number(offer.premiumAmount))}
                />
                <Row
                  label="Creada"
                  value={format(offer.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                />
              </dl>

              <div className="flex flex-wrap gap-2">
                <form action={approveOfferAction}>
                  <input type="hidden" name="offerId" value={offer.id} />
                  <Button type="submit">Approve</Button>
                </form>
              </div>

              <form action={rejectOfferAction} className="space-y-2">
                <input type="hidden" name="offerId" value={offer.id} />
                <label className="block text-xs font-medium text-slate-700">
                  Rejection note (required)
                </label>
                <textarea
                  name="rejectionNote"
                  rows={3}
                  required
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="outline">
                    Reject
                  </Button>
                </div>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Submitted to partner ({submittedOffers.length})
        </h2>
        <div className="space-y-4">
          {submittedOffers.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay ofertas enviadas al partner.
            </p>
          )}

          {submittedOffers.map((offer) => (
            <article
              key={offer.id}
              className="rounded-xl border border-slate-200 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {offer.product.partner.name} - {offer.product.name}
                </p>
                <Link
                  href={`/offers/${offer.id}`}
                  className="text-xs underline underline-offset-4"
                >
                  Ver detalle
                </Link>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                <Row
                  label="Cliente"
                  value={
                    offer.client
                      ? `${offer.client.firstName} ${offer.client.lastName}`
                      : "Sin cliente"
                  }
                />
                <Row
                  label="Email cliente"
                  value={offer.client?.email ?? "Sin email de cliente"}
                />
                <Row label="Lead type" value={offer.leadType} />
                <Row
                  label="Prima"
                  value={new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Number(offer.premiumAmount))}
                />
                <Row
                  label="Enviada"
                  value={
                    offer.submittedToPartnerAt
                      ? format(offer.submittedToPartnerAt, "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })
                      : "—"
                  }
                />
              </dl>

              <form action={activateContractFromOfferAction} className="space-y-2">
                <input type="hidden" name="offerId" value={offer.id} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Policy number
                    </label>
                    <input
                      name="policyNumber"
                      required
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Policy issued at
                    </label>
                    <input
                      type="date"
                      name="policyIssuedAt"
                      required
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Activate contract</Button>
                </div>
              </form>
            </article>
          ))}
        </div>
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

