async function main() {
  const { canAgentEditOfferStatus } = await import("../src/lib/offer-permissions");
  const draftStatus = "DRAFT";
  const rejectedStatus = "REJECTED";
  const pendingStatus = "PENDING_OPERATIONS_REVIEW";

  const draftEditable = canAgentEditOfferStatus(draftStatus);
  const rejectedEditable = canAgentEditOfferStatus(rejectedStatus);
  const pendingEditable = canAgentEditOfferStatus(pendingStatus);

  console.log(
    JSON.stringify({
      draftStatus,
      rejectedStatus,
      pendingStatus,
      draftEditable,
      rejectedEditable,
      pendingEditable,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

