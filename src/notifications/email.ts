/**
 * Email channel.
 *
 * PHASE 0/1: provider call is stubbed behind a single function. Wire a
 * transactional provider (Resend / SendGrid / SES) here — the rest of the app
 * only depends on the `sendEmail` signature.
 */
import type { NotificationMessage, NotificationResult } from "./index";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function sendEmail(
  msg: NotificationMessage,
): Promise<NotificationResult> {
  const env = getEnv();
  if (!env.EMAIL_PROVIDER_API_KEY) {
    // Not configured yet — log (redacted) and report a soft failure so callers
    // can decide whether to retry later. Never throw on missing config.
    logger.warn("email provider not configured; skipping send", {
      to: msg.to,
      subject: msg.subject,
    });
    return { ok: false, channel: "email", error: "email_not_configured" };
  }

  // TODO(phase-1): replace with real provider SDK call.
  logger.info("email queued (stub)", { to: msg.to, subject: msg.subject });
  return { ok: true, channel: "email", providerId: `stub-email-${Date.now()}` };
}
