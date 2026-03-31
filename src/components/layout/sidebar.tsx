import Link from "next/link";
import type { UserRole } from "@prisma/client";

type SidebarProps = {
  role: UserRole;
};

const navItems: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/dashboard/leads", label: "Leads", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  { href: "/dashboard/clients", label: "Clientes", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  { href: "/dashboard/offers", label: "Ofertas", roles: ["ADMIN", "OPERATIONS", "AGENT"] },
  {
    href: "/dashboard/admin/invitations",
    label: "Invitaciones",
    roles: ["ADMIN"],
  },
];

export function Sidebar({ role }: SidebarProps) {
  const items = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 border-r border-slate-200 bg-white px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          AtlasSeguros
        </p>
        <p className="text-sm text-slate-600">CRM interno</p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

