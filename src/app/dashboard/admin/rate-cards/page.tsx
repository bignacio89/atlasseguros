import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { createRateCardAction } from "@/actions/admin-catalog";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type AdminRateCardsPageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function AdminRateCardsPage({ searchParams }: AdminRateCardsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "ADMIN") redirect("/403");

  const [ranks, rateCards] = await Promise.all([
    prisma.rank.findMany({
      orderBy: { levelOrder: "asc" },
      select: { id: true, name: true, levelOrder: true },
    }),
    prisma.rateCard.findMany({
      orderBy: [{ effectiveDate: "desc" }, { rank: { levelOrder: "asc" } }, { leadType: "asc" }],
      select: {
        id: true,
        leadType: true,
        euroPerPoint: true,
        effectiveDate: true,
        rank: { select: { name: true, levelOrder: true } },
      },
    }),
  ]);

  const nextYearDate = `${new Date().getFullYear() + 1}-01-01`;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 mb-2 dark:text-slate-100">RateCards</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Gestión versionada de tarifas por rango y tipo de lead.
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
        <h2 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-100">Añadir nueva RateCard</h2>
        <form action={createRateCardAction} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <select name="rankId" required className={inputClass}>
            <option value="">Selecciona rango</option>
            {ranks.map((rank) => (
              <option key={rank.id} value={rank.id}>
                {rank.name}
              </option>
            ))}
          </select>
          <select name="leadType" defaultValue="STANDARD" className={inputClass}>
            <option value="STANDARD">STANDARD</option>
            <option value="ATLAS">ATLAS</option>
          </select>
          <input
            name="euroPerPoint"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Euro por punto"
            className={inputClass}
          />
          <input
            name="effectiveDate"
            type="date"
            defaultValue={nextYearDate}
            required
            className={inputClass}
          />
          <div className="flex justify-end">
            <FormSubmitButton idleText="Insertar nueva versión" pendingText="Insertando..." />
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-100">Listado versionado</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="py-2 text-left">EffectiveDate</th>
                <th className="py-2 text-left">Rango</th>
                <th className="py-2 text-left">LeadType</th>
                <th className="py-2 text-left">Euro/Point</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-200">
              {rateCards.map((row) => (
                <tr key={row.id}>
                  <td className="py-2">
                    {format(row.effectiveDate, "dd/MM/yyyy", { locale: es })}
                  </td>
                  <td className="py-2">{row.rank.name}</td>
                  <td className="py-2">{row.leadType}</td>
                  <td className="py-2">{Number(row.euroPerPoint).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-300 dark:focus:border-slate-300";

