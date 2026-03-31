import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";

type ClientProfileLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

const tabs = [
  { key: "overview", label: "Resumen", suffix: "" },
  { key: "documents", label: "Documentos", suffix: "/documents" },
  { key: "activity", label: "Actividad", suffix: "/activity" },
  { key: "payments", label: "Pagos", suffix: "/payments" },
] as const;

export default async function ClientProfileLayout({
  children,
  params,
}: ClientProfileLayoutProps) {
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
    },
  });

  if (!client) notFound();
  if (session.user.role === "AGENT" && client.agentId !== session.user.id) {
    redirect("/403");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Ficha de cliente
        </p>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">
          {client.firstName} {client.lastName}
        </h1>
        <p className="text-sm text-slate-600">{client.email}</p>
      </section>

      <nav className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <ul className="flex gap-3 text-sm">
          {tabs.map((tab) => (
            <li key={tab.key}>
              <Link
                href={`/dashboard/clients/${client.id}${tab.suffix}`}
                className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  );
}

