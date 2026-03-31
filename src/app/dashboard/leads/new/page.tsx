import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { createLeadAction } from "@/actions/leads";
import { Button } from "@/components/ui/button";

type NewLeadPageProps = {
  searchParams?: Promise<{ type?: string; message?: string }>;
};

export default async function NewLeadPage({ searchParams }: NewLeadPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  const params = searchParams ? await searchParams : undefined;
  const flashType = params?.type === "error" ? "error" : null;
  const flashMessage = params?.message;

  const agents =
    session.user.role === "AGENT"
      ? []
      : await prisma.user.findMany({
          where: { role: "AGENT" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        });

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Nuevo lead</h1>
          <p className="text-sm text-slate-600">
            Completa los datos del lead y registra los consentimientos GDPR.
          </p>
        </div>
        <Link href="/dashboard/leads" className="text-sm underline underline-offset-4">
          Volver al listado
        </Link>
      </section>

      {flashType === "error" && flashMessage ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {flashMessage}
        </p>
      ) : null}

      <form action={createLeadAction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <input type="hidden" name="privacyPolicyVersion" value="v1" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre">
            <input name="firstName" required className={inputClass} />
          </Field>
          <Field label="Apellidos">
            <input name="lastName" required className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className={inputClass} />
          </Field>
          <Field label="Teléfono">
            <input name="phone" className={inputClass} />
          </Field>
          <Field label="Tipo de lead">
            <select name="leadType" defaultValue="STANDARD" className={inputClass}>
              <option value="STANDARD">STANDARD</option>
              <option value="ATLAS">ATLAS</option>
            </select>
          </Field>
          {session.user.role !== "AGENT" && (
            <Field label="Agente asignado">
              <select name="agentId" className={inputClass}>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name ?? agent.email}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Origen">
            <input name="source" className={inputClass} />
          </Field>
          <Field label="Notas">
            <input name="notes" className={inputClass} />
          </Field>
        </div>

        <section className="rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Consentimientos GDPR</h2>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="consentDataProcessing" required />
            <span>DATA_PROCESSING (obligatorio)</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="consentMarketingEmail" />
            <span>MARKETING_EMAIL (opcional)</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="consentMarketingPhone" />
            <span>MARKETING_PHONE (opcional)</span>
          </label>
        </section>

        <div className="flex justify-end">
          <Button type="submit">Guardar lead</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900";

