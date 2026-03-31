import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";

type ContractLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

const tabs = [
  { key: "overview", label: "Resumen", suffix: "" },
  { key: "commissions", label: "Comisiones", suffix: "/commissions" },
  { key: "documents", label: "Documentos", suffix: "/documents" },
  { key: "after-sales", label: "Postventa", suffix: "/after-sales" },
] as const;

export default async function ContractLayout({ children, params }: ContractLayoutProps) {
  const resolvedParams = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const contract = await prisma.contract.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      agentId: true,
      policyNumber: true,
      internalReference: true,
      client: { select: { firstName: true, lastName: true } },
    },
  });

  if (!contract) notFound();
  if (session.user.role === "AGENT" && contract.agentId !== session.user.id) {
    redirect("/403");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Ficha de contrato</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">
          {contract.client.firstName} {contract.client.lastName}
        </h1>
        <p className="text-sm text-slate-600">
          Poliza: {contract.policyNumber ?? "Pendiente"} · Ref interna:{" "}
          {contract.internalReference ?? "Pendiente"}
        </p>
      </section>

      <nav className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <ul className="flex gap-3 text-sm">
          {tabs.map((tab) => (
            <li key={tab.key}>
              <Link
                href={`/dashboard/contracts/${contract.id}${tab.suffix}`}
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

