/**
 * Notification dispatch — channel-agnostic facade.
 *
 * Phase 1 ships email; Phase 2 adds WhatsApp. Callers (e.g. the waitlist
 * matcher) talk to `notify()` and never to a specific channel, so adding
 * WhatsApp later is a registry change, not a caller change.
 */
import type { PreferredChannel } from "@/types/domain";
import { sendEmail } from "./email";
import { sendWhatsApp } from "./whatsapp";
import { logger } from "@/lib/logger";

export interface NotificationMessage {
  to: string; // email address or phone number, per channel
  subject?: string; // email only
  body: string;
}

export interface NotificationResult {
  ok: boolean;
  channel: PreferredChannel;
  providerId?: string;
  error?: string;
}

export async function notify(
  channel: PreferredChannel,
  msg: NotificationMessage,
): Promise<NotificationResult> {
  try {
    if (channel === "email") return await sendEmail(msg);
    return await sendWhatsApp(msg);
  } catch (err) {
    logger.error("notification failed", { channel, err: String(err) });
    return { ok: false, channel, error: String(err) };
  }
}
