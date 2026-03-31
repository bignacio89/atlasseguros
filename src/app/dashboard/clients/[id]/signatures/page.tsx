import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { SignatureDocumentStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import {
  cancelSignatureRequestAction,
  downloadSignedPdfAction,
  manualUploadSignedPdfAction,
  syncSignatureStatusAction,
} from "@/actions/signatures";
import { SignatureSendSlideover } from "@/components/signatures/SignatureSendSlideover";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type ClientSignaturesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function ClientSignaturesPage({
  params,
  searchParams,
}: ClientSignaturesPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const client = await prisma.client.findUnique({
    where: { id: resolvedParams.id },
    select: { id: true, agentId: true },
  });
  if (!client) notFound();
  if (session.user.role === "AGENT" && client.agentId !== session.user.id) {
    redirect("/403");
  }

  const [partners, templates, contracts, signatures] = await Promise.all([
    prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, partnerId: true, name: true, templateCode: true },
    }),
    prisma.contract.findMany({
      where: { clientId: client.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, policyNumber: true },
    }),
    prisma.signatureDocument.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        sentAt: true,
        updatedAt: true,
        signaturitAuditUrl: true,
        signedDocumentS3Key: true,
        signaturitRequestId: true,
        template: {
          select: {
            name: true,
            partner: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const returnPath = `/dashboard/clients/${client.id}/signatures`;

  return (
    <div className="space-y-4">
      {resolvedSearchParams.message && (
        <section
          role={resolvedSearchParams.type === "error" ? "alert" : "status"}
          aria-live={resolvedSearchParams.type === "error" ? "assertive" : "polite"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            resolvedSearchParams.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {resolvedSearchParams.message}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Firmas digitales</h2>
          <SignatureSendSlideover
            clientId={client.id}
            partners={partners}
            templates={templates}
            contracts={contracts}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="py-2 text-left">Documento</th>
                <th className="py-2 text-left">Partner</th>
                <th className="py-2 text-left">Estado</th>
                <th className="py-2 text-left">Enviado</th>
                <th className="py-2 text-left">Actualizado</th>
                <th className="py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-200">
              {signatures.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-500 dark:text-slate-400">
                    No hay documentos de firma para este cliente.
                  </td>
                </tr>
              )}
              {signatures.map((row) => (
                <tr key={row.id}>
                  <td className="py-2">{row.template.name}</td>
                  <td className="py-2">{row.template.partner.name}</td>
                  <td className="py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-2">
                    {row.sentAt ? format(row.sentAt, "dd/MM/yyyy HH:mm", { locale: es }) : "—"}
                  </td>
                  <td className="py-2">
                    {format(row.updatedAt, "dd/MM/yyyy HH:mm", { locale: es })}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {(row.status === "SENT" || row.status === "VIEWED") && (
                        <>
                          <form action={syncSignatureStatusAction}>
                            <input type="hidden" name="signatureDocumentId" value={row.id} />
                            <input type="hidden" name="returnPath" value={returnPath} />
                            <FormSubmitButton idleText="Sync status" pendingText="Syncing..." />
                          </form>
                          <form action={cancelSignatureRequestAction}>
                            <input type="hidden" name="signatureDocumentId" value={row.id} />
                            <input type="hidden" name="returnPath" value={returnPath} />
                            <FormSubmitButton
                              idleText="Cancel"
                              pendingText="Cancelling..."
                              variant="outline"
                            />
                          </form>
                        </>
                      )}

                      {row.status === "SIGNED" && (
                        <>
                          {row.signaturitAuditUrl ? (
                            <a
                              href={row.signaturitAuditUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm underline underline-offset-4 dark:text-slate-200"
                            >
                              View audit trail
                            </a>
                          ) : (
                            "—"
                          )}
                          <form action={downloadSignedPdfAction}>
                            <input type="hidden" name="signatureDocumentId" value={row.id} />
                            <input type="hidden" name="returnPath" value={returnPath} />
                            <FormSubmitButton
                              idleText="Download signed PDF"
                              pendingText="Downloading..."
                              variant="outline"
                            />
                          </form>
                        </>
                      )}

                      {row.status === "MANUALLY_UPLOADED" && (
                        <form action={downloadSignedPdfAction}>
                          <input type="hidden" name="signatureDocumentId" value={row.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <FormSubmitButton
                            idleText="Download PDF"
                            pendingText="Downloading..."
                            variant="outline"
                          />
                        </form>
                      )}

                      {(row.status === "SENT" || row.status === "VIEWED") &&
                        session.user.role === "OPERATIONS" && (
                          <form action={manualUploadSignedPdfAction}>
                            <input type="hidden" name="signatureDocumentId" value={row.id} />
                            <input type="hidden" name="returnPath" value={returnPath} />
                            <input type="file" name="signedPdf" accept="application/pdf" required />
                            <FormSubmitButton
                              idleText="Upload signed PDF manually"
                              pendingText="Uploading..."
                              variant="outline"
                            />
                          </form>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: SignatureDocumentStatus }) {
  const className =
    status === "SIGNED"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
      : status === "DECLINED"
        ? "border-red-300 bg-red-100 text-red-800"
        : status === "EXPIRED"
          ? "border-amber-300 bg-amber-100 text-amber-800"
          : status === "SENT" || status === "VIEWED"
            ? "border-blue-300 bg-blue-100 text-blue-800"
            : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}

