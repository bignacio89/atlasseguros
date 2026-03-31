// Payment service interface — supplier-agnostic
// Current implementation: Stripe (stub)
// To switch suppliers: replace the implementation below, keep the interface

export interface PaymentSession {
  sessionId: string;
  sessionUrl: string;
  provider: "stripe" | "redsys" | "other";
}

export interface PaymentStatus {
  status: "paid" | "pending" | "past_due" | "cancelled";
  provider: "stripe" | "redsys" | "other";
  providerReference: string;
  paidAt?: Date;
}

export interface InstallmentSummary {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  status: "paid" | "pending" | "failed";
  providerReference: string;
}

// --- Interface (never change this) ---

export async function createFullPaymentSession(
  offerId: string,
  amount: number,
  clientEmail: string,
): Promise<PaymentSession> {
  void clientEmail;
  return {
    sessionId: `mock_session_${offerId}`,
    sessionUrl: `/mock-payment?offerId=${offerId}&amount=${amount}`,
    provider: "stripe",
  };
}

export async function createInstallmentPlan(
  offerId: string,
  totalAmount: number,
  installmentCount: number,
  clientEmail: string,
): Promise<PaymentSession> {
  void totalAmount;
  void clientEmail;
  return {
    sessionId: `mock_plan_${offerId}`,
    sessionUrl: `/mock-payment?offerId=${offerId}&installments=${installmentCount}`,
    provider: "stripe",
  };
}

export async function getPaymentStatus(contractId: string): Promise<PaymentStatus> {
  return {
    status: "pending",
    provider: "stripe",
    providerReference: `mock_ref_${contractId}`,
  };
}

export async function getInstallments(contractId: string): Promise<InstallmentSummary[]> {
  void contractId;
  return [];
}

export async function retryPayment(contractId: string): Promise<void> {
  console.log(`[PAYMENT STUB] Retry payment for contract ${contractId}`);
}

export async function createPortalSession(
  contractId: string,
  returnUrl: string,
): Promise<string> {
  void returnUrl;
  return `/mock-portal?contractId=${contractId}`;
}

