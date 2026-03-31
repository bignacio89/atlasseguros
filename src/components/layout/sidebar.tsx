import Link from "next/link";
import type { UserRole } from "@prisma/client";

type SidebarProps = {
  role: UserRole;
};

const navItems: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  { href: "/dashboard/leads", label: "Leads", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  { href: "/dashboard/clients", label: "Clientes", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  { href: "/dashboard/offers", label: "Ofertas", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  { href: "/dashboard/contracts", label: "Contratos", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  { href: "/dashboard/commissions", label: "Comisiones", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  {
    href: "/dashboard/operations/offers",
    label: "Validacion ofertas",
    roles: ["ADMIN", "OPERATIONS"],
  },
  {
    href: "/dashboard/operations/after-sales",
    label: "Cola postventa",
    roles: ["ADMIN", "OPERATIONS"],
  },
  {
    href: "/dashboard/operations/payments",
    label: "Monitoreo pagos",
    roles: ["ADMIN", "OPERATIONS"],
  },
  {
    href: "/dashboard/admin/invitations",
    label: "Invitaciones",
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/admin/agents",
    label: "Agentes",
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/admin/partners",
    label: "Partners",
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/admin/rate-cards",
    label: "RateCards",
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/admin/audit-log",
    label: "AuditLog",
    roles: ["ADMIN"],
  },
];

export function Sidebar({ role }: SidebarProps) {
  const items = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          AtlasSeguros
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">CRM interno</p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

