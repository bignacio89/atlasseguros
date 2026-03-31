"use client";

import * as React from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { LeadType, UserRole } from "@prisma/client";
import { archiveLeadAction, convertLeadToClientAction } from "@/actions/leads";

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  leadType: LeadType;
  agentId: string;
  agentName: string | null;
  createdAt: string;
  clientId: string | null;
};

type AgentFilterOption = {
  id: string;
  name: string | null;
};

type LeadsTableProps = {
  role: UserRole;
  data: LeadRow[];
  agentOptions: AgentFilterOption[];
};

export function LeadsTable({ role, data, agentOptions }: LeadsTableProps) {
  const [rows, setRows] = React.useState<LeadRow[]>(data);
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set());
  const [leadTypeFilter, setLeadTypeFilter] = React.useState<string>("");
  const [agentFilter, setAgentFilter] = React.useState<string>("");

  React.useEffect(() => {
    setRows(data);
  }, [data]);

  const runOptimisticMutation = React.useCallback(
    async (leadId: string, action: (formData: FormData) => Promise<unknown>) => {
      const previous = rows;
      setPendingIds((current) => new Set(current).add(leadId));
      setRows((current) => current.filter((row) => row.id !== leadId));

      const formData = new FormData();
      formData.set("leadId", leadId);
      formData.set("optimistic", "1");

      try {
        await action(formData);
      } catch {
        setRows(previous);
      } finally {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(leadId);
          return next;
        });
      }
    },
    [rows],
  );

  const columns = React.useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Nombre",
        cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email ?? "—",
      },
      {
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        accessorKey: "leadType",
        header: "Tipo",
        cell: ({ row }) => row.original.leadType,
        filterFn: "equalsString",
      },
      {
        accessorKey: "agentName",
        header: "Agente",
        cell: ({ row }) => row.original.agentName ?? "—",
      },
      {
        accessorKey: "createdAt",
        header: "Alta",
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => {
          const leadId = row.original.id;
          const isPending = pendingIds.has(leadId);
          return (
            <div className="flex gap-3 items-center">
              <Link
                href={`/dashboard/leads/${leadId}/edit`}
                className="text-sm underline underline-offset-4 dark:text-slate-200"
              >
                Editar
              </Link>
              {!row.original.clientId && (
                <button
                  type="button"
                  disabled={isPending}
                  className="text-sm underline underline-offset-4 disabled:opacity-50 dark:text-slate-200"
                  onClick={() => runOptimisticMutation(leadId, convertLeadToClientAction)}
                >
                  Convertir
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                className="text-sm underline underline-offset-4 text-red-700 disabled:opacity-50 dark:text-red-400"
                onClick={() => runOptimisticMutation(leadId, archiveLeadAction)}
              >
                Archivar
              </button>
            </div>
          );
        },
      },
    ],
    [pendingIds, runOptimisticMutation],
  );

  const filteredData = React.useMemo(() => {
    return rows.filter((row) => {
      const leadTypePass = leadTypeFilter ? row.leadType === leadTypeFilter : true;
      const agentPass = agentFilter ? row.agentId === agentFilter : true;
      return leadTypePass && agentPass;
    });
  }, [rows, leadTypeFilter, agentFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Filtrar por tipo
          </label>
          <select
            value={leadTypeFilter}
            onChange={(event) => setLeadTypeFilter(event.target.value)}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-300 dark:focus:border-slate-300"
          >
            <option value="">Todos</option>
            <option value="ATLAS">ATLAS</option>
            <option value="STANDARD">STANDARD</option>
          </select>
        </div>

        {role !== "AGENT" && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Filtrar por agente
            </label>
            <select
              value={agentFilter}
              onChange={(event) => setAgentFilter(event.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-300 dark:focus:border-slate-300"
            >
              <option value="">Todos</option>
              {agentOptions.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name ?? agent.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="py-2 px-3 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-200">
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-4 px-3 text-slate-500 dark:text-slate-400">
                  No hay leads para los filtros seleccionados.
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-2 px-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

