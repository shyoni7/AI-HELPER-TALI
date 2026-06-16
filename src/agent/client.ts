/**
 * Anthropic client singleton.
 *
 * The engine drives a manual tool-use loop (see engine.ts) rather than the SDK
 * tool runner, because some tools (booking, cancelling) are hard to reverse and
 * benefit from explicit, auditable control over each step.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __taliAnthropic: Anthropic | undefined;
}

export function getAnthropic(): Anthropic {
  if (!global.__taliAnthropic) {
    global.__taliAnthropic = new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY });
  }
  return global.__taliAnthropic;
}

export function getModel(): string {
  return getEnv().ANTHROPIC_MODEL;
}
