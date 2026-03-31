import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function ClientActivityPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-2">Actividad</h2>
      <p className="text-sm text-slate-600">
        Sección preparada para mostrar actividad comercial e historial del cliente.
      </p>
    </section>
  );
}

