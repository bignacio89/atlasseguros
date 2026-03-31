export function canAgentEditOfferStatus(status: string) {
  return status === "DRAFT" || status === "REJECTED";
}

