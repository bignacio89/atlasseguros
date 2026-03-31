// Signature service interface — supplier-agnostic
// Current implementation: Signaturit (stub)
// To switch suppliers: replace the implementation below, keep the interface

export interface SignatureRequest {
  providerRequestId: string;
  auditUrl?: string;
  provider: "signaturit" | "docuseal" | "hellosign" | "other";
}

export interface SignatureStatusResult {
  status: "sent" | "viewed" | "signed" | "declined" | "expired";
  signedDocumentUrl?: string;
  declineReason?: string;
  viewedAt?: Date;
  signedAt?: Date;
  declinedAt?: Date;
  expiredAt?: Date;
}

// --- Interface (never change this) ---

export async function sendForSignature(
  templateCode: string,
  signatoryEmail: string,
  signatoryName: string,
): Promise<SignatureRequest> {
  console.log(`[SIGNATURE STUB] Send ${templateCode} to ${signatoryEmail} (${signatoryName})`);
  return {
    providerRequestId: `mock_req_${Date.now()}`,
    auditUrl: `https://mock-audit.example.com/${Date.now()}`,
    provider: "signaturit",
  };
}

export async function cancelSignatureRequest(providerRequestId: string): Promise<void> {
  console.log(`[SIGNATURE STUB] Cancel request ${providerRequestId}`);
}

export async function syncSignatureStatus(
  providerRequestId: string,
): Promise<SignatureStatusResult> {
  console.log(`[SIGNATURE STUB] Sync status ${providerRequestId}`);
  return { status: "sent" };
}

export async function downloadSignedDocument(providerRequestId: string): Promise<Buffer | null> {
  console.log(`[SIGNATURE STUB] Download signed doc for ${providerRequestId}`);
  return null;
}

export {};
