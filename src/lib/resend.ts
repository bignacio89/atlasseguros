import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_ADDRESS;

if (!apiKey || !fromAddress) {
  // In dev this may be unset; we fail lazily when sending.
    console.warn(
    "[resend] RESEND_API_KEY or RESEND_FROM_ADDRESS is not configured",
  );
}

export const resend =
  apiKey && fromAddress
    ? new Resend(apiKey)
    : null;

export const RESEND_FROM_ADDRESS = fromAddress ?? "";

