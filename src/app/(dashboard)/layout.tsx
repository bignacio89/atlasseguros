import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  async function handleLogout() {
    "use server";
    await signOut({ redirectTo: "/auth/login" });
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={session.user.role} />
      <main className="flex-1 min-w-0 px-6 py-6">
        <div className="mb-4 flex justify-end">
          <form action={handleLogout}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}

