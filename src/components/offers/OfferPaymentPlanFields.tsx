"use client";

import { useMemo, useState } from "react";

type ProductOption = {
  id: string;
  label: string;
  isConsultationFee: boolean;
};

type OfferPaymentPlanFieldsProps = {
  products: ProductOption[];
};

export function OfferPaymentPlanFields({ products }: OfferPaymentPlanFieldsProps) {
  const [productId, setProductId] = useState("");
  const [premiumAmount, setPremiumAmount] = useState<number>(0);
  const [paymentPlan, setPaymentPlan] = useState<"FULL" | "INSTALLMENT">("FULL");
  const [installmentCount, setInstallmentCount] = useState<number>(3);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [products, productId],
  );
  const isConsultationFee = selectedProduct?.isConsultationFee ?? false;
  const monthlyAmount =
    paymentPlan === "INSTALLMENT" && installmentCount > 0
      ? premiumAmount / installmentCount
      : 0;

  return (
    <>
      <input
        type="hidden"
        name="paymentPlan"
        value={isConsultationFee ? paymentPlan : ""}
      />
      <input
        type="hidden"
        name="installmentCount"
        value={isConsultationFee && paymentPlan === "INSTALLMENT" ? String(installmentCount) : ""}
      />

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">Producto</label>
        <select
          name="productId"
          required
          className={inputClass}
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
        >
          <option value="">Selecciona un producto</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">Importe prima (EUR)</label>
        <input
          name="premiumAmount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className={inputClass}
          onChange={(event) => setPremiumAmount(Number(event.target.value || 0))}
        />
      </div>

      {isConsultationFee && (
        <div className="space-y-2 md:col-span-2 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-medium text-slate-700">Plan de pago</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="paymentPlanRadio"
                value="FULL"
                checked={paymentPlan === "FULL"}
                onChange={() => setPaymentPlan("FULL")}
              />
              Pago completo
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="paymentPlanRadio"
                value="INSTALLMENT"
                checked={paymentPlan === "INSTALLMENT"}
                onChange={() => setPaymentPlan("INSTALLMENT")}
              />
              Cuotas mensuales
            </label>
          </div>

          {paymentPlan === "INSTALLMENT" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Numero de cuotas
                </label>
                <select
                  className={inputClass}
                  value={installmentCount}
                  onChange={(event) => setInstallmentCount(Number(event.target.value))}
                >
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={9}>9 meses</option>
                  <option value={12}>12 meses</option>
                </select>
              </div>
              <div className="text-sm text-slate-700 flex items-end">
                Cuota mensual estimada:{" "}
                {new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(monthlyAmount || 0)}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

const inputClass =
  "block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900";

