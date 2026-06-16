/**
 * SMS delivery — provider-agnostic facade (M2).
 *
 * The OTP/auth code depends only on `sendSms`. The provider (Twilio / an
 * Israeli gateway / etc.) is chosen later; until then, when no provider key is
 * configured the code is logged so the login flow is testable end-to-end.
 *
 * SECURITY: the OTP is sensitive. It is logged ONLY when no provider is set
 * (i.e. local/dev), and the logger redacts phone numbers.
 */
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface SmsResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const env = getEnv();
  if (!env.SMS_PROVIDER_API_KEY) {
    // Dev fallback: surface the message locally. `to` is redacted by the logger.
    logger.info("[sms:dev] would send", { to, body });
    // eslint-disable-next-line no-console
    console.log(`\n[DEV OTP] → ${to}: ${body}\n`);
    return { ok: true, providerId: "dev-console" };
  }
  // TODO(M2): integrate the chosen SMS provider SDK here.
  logger.warn("SMS provider key set but integration not implemented");
  return { ok: false, error: "sms_not_implemented" };
}
