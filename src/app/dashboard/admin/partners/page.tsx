import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import {
  createPartnerAction,
  createProductAction,
  deletePartnerAction,
  deleteProductAction,
  togglePartnerActiveAction,
  toggleProductActiveAction,
  updatePartnerAction,
  updateProductAction,
} from "@/actions/admin-catalog";
import {
  createDocumentTemplateAction,
  deleteDocumentTemplateAction,
  toggleDocumentTemplateActiveAction,
  updateDocumentTemplateAction,
} from "@/actions/document-templates";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type AdminPartnersPageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function AdminPartnersPage({ searchParams }: AdminPartnersPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "ADMIN") redirect("/403");

  const partners = await prisma.partner.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      products: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          commissionUpfrontPct: true,
          feePct: true,
          isConsultationFee: true,
          isActive: true,
        },
      },
      documentTemplates: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          templateCode: true,
          isActive: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 mb-2 dark:text-slate-100">Partners, productos y plantillas</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Panel maestro para catálogo comercial y plantillas de firma.
        </p>
      </section>

      {resolvedSearchParams.message && (
        <section
          className={`rounded-xl border px-4 py-3 text-sm ${
            resolvedSearchParams.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {resolvedSearchParams.message}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-100">Crear partner</h2>
        <form action={createPartnerAction} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input name="name" required placeholder="Nombre" className={inputClass} />
          <input name="code" required placeholder="Código" className={inputClass} />
          <div className="flex justify-end">
            <FormSubmitButton idleText="Crear partner" pendingText="Creando..." />
          </div>
        </form>
      </section>

      <div className="space-y-6">
        {partners.map((partner) => (
          <details key={partner.id} open className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">
              {partner.name} ({partner.code}) {partner.isActive ? "ACTIVO" : "INACTIVO"}
            </summary>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-slate-200 p-3 space-y-2 dark:border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Partner
                </h3>
                <div className="flex flex-wrap gap-2">
                  <form action={updatePartnerAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={partner.id} />
                    <input name="name" defaultValue={partner.name} required className={inputClass} />
                    <input name="code" defaultValue={partner.code} required className={inputClass} />
                    <FormSubmitButton idleText="Guardar partner" pendingText="Guardando..." variant="outline" />
                  </form>
                  <form action={togglePartnerActiveAction}>
                    <input type="hidden" name="id" value={partner.id} />
                    <FormSubmitButton
                      idleText={partner.isActive ? "Desactivar partner" : "Activar partner"}
                      pendingText="Actualizando..."
                      variant="outline"
                    />
                  </form>
                  <form action={deletePartnerAction}>
                    <input type="hidden" name="id" value={partner.id} />
                    <FormSubmitButton idleText="Delete partner" pendingText="Eliminando..." variant="destructive" />
                  </form>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 space-y-3 dark:border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Productos
                </h3>
                <form action={createProductAction} className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  <input type="hidden" name="partnerId" value={partner.id} />
                  <input name="name" required placeholder="Nombre producto" className={inputClass} />
                  <input name="description" placeholder="Descripción" className={inputClass} />
                  <input
                    name="commissionUpfrontPct"
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    placeholder="commissionUpfrontPct"
                    className={inputClass}
                  />
                  <input
                    name="feePct"
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    placeholder="feePct"
                    className={inputClass}
                  />
                  <select name="isConsultationFee" defaultValue="false" className={inputClass}>
                    <option value="false">No consultation fee</option>
                    <option value="true">Consultation fee</option>
                  </select>
                  <div className="md:col-span-6 flex justify-end">
                    <FormSubmitButton idleText="Add product" pendingText="Creando..." />
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800">
                      <tr>
                        <th className="py-2 text-left">Nombre</th>
                        <th className="py-2 text-left">Descripción</th>
                        <th className="py-2 text-left">commissionUpfrontPct</th>
                        <th className="py-2 text-left">feePct</th>
                        <th className="py-2 text-left">ConsultationFee</th>
                        <th className="py-2 text-left">Activo</th>
                        <th className="py-2 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-200">
                      {partner.products.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-3 text-slate-500 dark:text-slate-400">
                            Sin productos para este partner.
                          </td>
                        </tr>
                      )}
                      {partner.products.map((product) => (
                        <tr key={product.id}>
                          <td className="py-2">
                            <form action={updateProductAction} className="flex flex-wrap gap-2">
                              <input type="hidden" name="id" value={product.id} />
                              <input name="name" defaultValue={product.name} required className={inputClass} />
                              <input
                                name="description"
                                defaultValue={product.description ?? ""}
                                className={inputClass}
                              />
                              <input
                                name="commissionUpfrontPct"
                                type="number"
                                step="0.0001"
                                min="0"
                                defaultValue={Number(product.commissionUpfrontPct)}
                                required
                                className={inputClass}
                              />
                              <input
                                name="feePct"
                                type="number"
                                step="0.0001"
                                min="0"
                                defaultValue={Number(product.feePct)}
                                required
                                className={inputClass}
                              />
                              <select
                                name="isConsultationFee"
                                defaultValue={product.isConsultationFee ? "true" : "false"}
                                className={inputClass}
                              >
                                <option value="false">No</option>
                                <option value="true">Sí</option>
                              </select>
                              <FormSubmitButton idleText="Edit" pendingText="Guardando..." variant="outline" />
                            </form>
                          </td>
                          <td className="py-2">{product.description ?? "—"}</td>
                          <td className="py-2">{Number(product.commissionUpfrontPct).toFixed(4)}</td>
                          <td className="py-2">{Number(product.feePct).toFixed(4)}</td>
                          <td className="py-2">{product.isConsultationFee ? "Sí" : "No"}</td>
                          <td className="py-2">{product.isActive ? "Sí" : "No"}</td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <form action={toggleProductActiveAction}>
                                <input type="hidden" name="id" value={product.id} />
                                <FormSubmitButton
                                  idleText={product.isActive ? "Desactivar" : "Activar"}
                                  pendingText="Actualizando..."
                                  variant="outline"
                                />
                              </form>
                              <form action={deleteProductAction}>
                                <input type="hidden" name="id" value={product.id} />
                                <FormSubmitButton
                                  idleText="Delete"
                                  pendingText="Eliminando..."
                                  variant="destructive"
                                />
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <form action={createDocumentTemplateAction} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input type="hidden" name="partnerId" value={partner.id} />
                <input
                  name="name"
                  placeholder="Nombre plantilla"
                  required
                  className={inputClass}
                />
                <input
                  name="templateCode"
                  placeholder="templateCode"
                  required
                  className={inputClass}
                />
                <div className="md:col-span-2 flex justify-end">
                  <FormSubmitButton idleText="Add template" pendingText="Creando..." />
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="py-2 text-left">Nombre</th>
                      <th className="py-2 text-left">templateCode</th>
                      <th className="py-2 text-left">Activa</th>
                      <th className="py-2 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-200">
                    {partner.documentTemplates.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-3 text-slate-500 dark:text-slate-400">
                          Sin plantillas para este partner.
                        </td>
                      </tr>
                    )}
                    {partner.documentTemplates.map((template) => (
                      <tr key={template.id}>
                        <td className="py-2">
                          <form action={updateDocumentTemplateAction} className="flex gap-2">
                            <input type="hidden" name="id" value={template.id} />
                            <input name="name" defaultValue={template.name} required className={inputClass} />
                            <input
                              name="templateCode"
                              defaultValue={template.templateCode}
                              required
                              className={inputClass}
                            />
                            <FormSubmitButton idleText="Edit" pendingText="Guardando..." variant="outline" />
                          </form>
                        </td>
                        <td className="py-2">{template.templateCode}</td>
                        <td className="py-2">{template.isActive ? "Sí" : "No"}</td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <form action={toggleDocumentTemplateActiveAction}>
                              <input type="hidden" name="id" value={template.id} />
                              <FormSubmitButton
                                idleText={template.isActive ? "Desactivar" : "Activar"}
                                pendingText="Actualizando..."
                                variant="outline"
                              />
                            </form>
                            <form action={deleteDocumentTemplateAction}>
                              <input type="hidden" name="id" value={template.id} />
                              <FormSubmitButton idleText="Delete" pendingText="Eliminando..." variant="destructive" />
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-300 dark:focus:border-slate-300";

