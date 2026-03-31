import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";

type ContractDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContractDocumentsPage({ params }: ContractDocumentsPageProps) {
  const resolvedParams = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const contract = await prisma.contract.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      agentId: true,
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, mimeType: true, sizeBytes: true, createdAt: true },
      },
    },
  });

  if (!contract) notFound();
  if (session.user.role === "AGENT" && contract.agentId !== session.user.id) {
    redirect("/403");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Documentos</h2>
      {contract.documents.length === 0 ? (
        <p className="text-sm text-slate-500">No hay documentos subidos para este contrato.</p>
      ) : (
        <ul className="space-y-2">
          {contract.documents.map((doc) => (
            <li
              key={doc.id}
              className="rounded-md border border-slate-200 p-3 text-sm flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium text-slate-900">{doc.name}</p>
                <p className="text-slate-500">
                  {doc.mimeType} · {Math.round(doc.sizeBytes / 1024)} KB
                </p>
              </div>
              <span className="text-xs text-slate-500">
                {format(doc.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

