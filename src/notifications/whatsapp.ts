/**
 * WhatsApp channel — PHASE 2 infrastructure only.
 *
 * The signature matches the email channel so the notification facade can route
 * to it unchanged. Returns a "not implemented" result for now.
 */
import type { NotificationMessage, NotificationResult } from "./index";
import { logger } from "@/lib/logger";

export async function sendWhatsApp(
  msg: NotificationMessage,
): Promise<NotificationResult> {
  // TODO(phase-2): integrate WhatsApp Business Cloud API.
  logger.warn("whatsapp channel not implemented yet", { to: msg.to });
  return { ok: false, channel: "whatsapp", error: "whatsapp_not_implemented" };
}
