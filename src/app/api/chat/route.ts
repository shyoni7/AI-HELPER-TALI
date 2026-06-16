/**
 * POST /api/chat — one user turn through the agent.
 *
 * Phase 0: stateless-ish. The client sends the prior `messages` plus the new
 * user text; the route runs the agent loop and returns the assistant reply.
 * Persisting transcripts into `conversations` is wired via persistTranscript()
 * but tolerant of a missing DB so local dev works before migrations run.
 *
 * Security: origin-checked, input-validated, and errors never leak internals.
 */
import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { runAgentTurn } from "@/agent/engine";
import { getEnv, allowedOrigins } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate the incoming body. `messages` is the prior history (text only in
// Phase 0; tool blocks are reconstructed server-side each turn).
const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().nullable().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(50)
    .optional()
    .default([]),
});

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin / server-to-server
  return allowedOrigins().includes(origin);
}

export async function POST(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  try {
    const env = getEnv();
    const history: Anthropic.MessageParam[] = parsed.history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await runAgentTurn(history, parsed.message, {
      conversationId: parsed.conversationId ?? null,
      patientId: null, // resolved in a later phase via auth/session
      timezone: env.CENTER_TIMEZONE,
    });

    return NextResponse.json({
      reply: result.text,
      toolsUsed: result.toolsUsed,
    });
  } catch (err) {
    logger.error("chat route failed", { err: String(err) });
    return NextResponse.json(
      { error: "אירעה שגיאה. נסו שוב מאוחר יותר." },
      { status: 500 },
    );
  }
}
