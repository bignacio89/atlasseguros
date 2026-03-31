import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import {
  createAgentAction,
  deleteAgentAction,
  updateAgentAction,
} from "@/actions/agents";
import { Button } from "@/components/ui/button";

export default async function AdminAgentsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/403");
  }

  const [agents, ranks] = await Promise.all([
    prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        rankId: true,
        uplineId: true,
        createdAt: true,
      },
    }),
    prisma.rank.findMany({
      orderBy: { levelOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Gestión de agentes
        </h1>
        <p className="text-sm text-slate-600">
          Alta, edición y eliminación de cuentas de agentes.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Nuevo agente
        </h2>
        <form action={createAgentAction} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} />
          </Field>
          <Field label="Nombre">
            <input name="name" type="text" required className={inputClass} />
          </Field>
          <Field label="Contraseña inicial">
            <input name="password" type="password" required minLength={8} className={inputClass} />
          </Field>
          <Field label="Rango">
            <select name="rankId" className={inputClass}>
              <option value="">—</option>
              {ranks.map((rank) => (
                <option key={rank.id} value={rank.id}>
                  {rank.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Upline">
            <select name="uplineId" className={inputClass}>
              <option value="">—</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-5 flex justify-end">
            <Button type="submit">Crear agente</Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Agentes actuales
        </h2>
        <div className="space-y-4">
          {agents.length === 0 && (
            <p className="text-sm text-slate-500">No hay agentes registrados.</p>
          )}
          {agents.map((agent) => (
            <form
              key={agent.id}
              action={updateAgentAction}
              className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border border-slate-200 rounded-xl p-4"
            >
              <input type="hidden" name="id" value={agent.id} />
              <Field label="Email">
                <input value={agent.email} readOnly className={`${inputClass} bg-slate-100`} />
              </Field>
              <Field label="Nombre">
                <input name="name" defaultValue={agent.name} required className={inputClass} />
              </Field>
              <Field label="Rango">
                <select name="rankId" defaultValue={agent.rankId ?? ""} className={inputClass}>
                  <option value="">—</option>
                  {ranks.map((rank) => (
                    <option key={rank.id} value={rank.id}>
                      {rank.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Upline">
                <select name="uplineId" defaultValue={agent.uplineId ?? ""} className={inputClass}>
                  <option value="">—</option>
                  {agents
                    .filter((a) => a.id !== agent.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button type="submit">Guardar</Button>
                <button
                  formAction={deleteAgentAction}
                  type="submit"
                  className="inline-flex items-center rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900";

