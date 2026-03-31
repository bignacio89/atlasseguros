"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { sendSignatureRequestAction } from "@/actions/signatures";

type PartnerOption = {
  id: string;
  name: string;
};

type TemplateOption = {
  id: string;
  partnerId: string;
  name: string;
  templateCode: string;
};

type ContractOption = {
  id: string;
  policyNumber: string | null;
};

type SignatureSendSlideoverProps = {
  clientId: string;
  partners: PartnerOption[];
  templates: TemplateOption[];
  contracts: ContractOption[];
};

export function SignatureSendSlideover({
  clientId,
  partners,
  templates,
  contracts,
}: SignatureSendSlideoverProps) {
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.partnerId === partnerId),
    [templates, partnerId],
  );

  useEffect(() => {
    if (!open) return;
    const triggerEl = triggerRef.current;
    firstFieldRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!panelRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      triggerEl?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="signature-send-dialog"
      >
        Send document for signature
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/30"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            id="signature-send-dialog"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signature-send-dialog-title"
            className="h-full w-full max-w-lg bg-white p-6 shadow-xl overflow-y-auto dark:bg-slate-950"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="signature-send-dialog-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Enviar documento a firma
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm underline underline-offset-4 dark:text-slate-200"
                aria-label="Cerrar panel de envío de firma"
              >
                Cerrar
              </button>
            </div>

            <form action={sendSignatureRequestAction} className="space-y-3">
              <input type="hidden" name="clientId" value={clientId} />

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Partner</label>
                <select
                  ref={firstFieldRef}
                  name="partnerId"
                  required
                  value={partnerId}
                  onChange={(event) => setPartnerId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecciona partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Tipo documento</label>
                <select name="templateId" required className={inputClass} disabled={!partnerId}>
                  <option value="">Selecciona plantilla</option>
                  {filteredTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.templateCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Vincular contrato (opcional)
                </label>
                <select name="contractId" className={inputClass}>
                  <option value="">Sin vincular</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.policyNumber ?? contract.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Notas</label>
                <textarea name="notes" rows={3} className={inputClass} />
              </div>

              <div className="flex justify-end">
                <FormSubmitButton idleText="Enviar" pendingText="Enviando..." />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const inputClass =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-300 dark:focus:border-slate-300";

