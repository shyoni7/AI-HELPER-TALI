/**
 * Agent engine — manual Claude tool-use loop.
 *
 * Why manual (not the SDK tool runner): several tools are hard-to-reverse and
 * outward-facing (booking, cancelling, contacting people). A manual loop lets
 * us audit/log every tool call and keeps the door open for human-in-the-loop
 * gating without rewriting the orchestration.
 *
 * Model: claude-opus-4-8 with adaptive thinking. The system prompt + tool
 * definitions form a stable, cacheable prefix.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, getModel } from "./client";
import { SYSTEM_PROMPT, dateContext } from "./system-prompt";
import { TOOLS, TOOLS_BY_NAME } from "./tools";
import { toAnthropicTool, type ToolContext } from "./tools/types";
import { logger } from "@/lib/logger";

const MAX_ITERATIONS = 8;
const MAX_TOKENS = 4096;

export interface RunResult {
  /** Final assistant text shown to the user. */
  text: string;
  /** Full message history (for persistence into conversations.transcript). */
  messages: Anthropic.MessageParam[];
  /** Names of tools invoked during the turn (for observability). */
  toolsUsed: string[];
}

/**
 * Run one user turn through the agent loop until Claude stops calling tools.
 * `history` is the prior conversation (already in Anthropic message shape).
 */
export async function runAgentTurn(
  history: Anthropic.MessageParam[],
  userMessage: string,
  ctx: ToolContext,
): Promise<RunResult> {
  const client = getAnthropic();
  const anthropicTools = TOOLS.map(toAnthropicTool);
  const toolsUsed: string[] = [];

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  // Stable system prefix (cacheable) + a small trailing date block.
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: dateContext(ctx.timezone) },
  ];

  let finalText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      system,
      tools: anthropicTools,
      messages,
    });

    // Append the assistant turn (preserves tool_use blocks for the loop).
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      break;
    }

    // Execute every tool_use block and collect results for one user turn.
    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const use of toolUses) {
      toolsUsed.push(use.name);
      const tool = TOOLS_BY_NAME.get(use.name);
      if (!tool) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: `Unknown tool: ${use.name}`,
          is_error: true,
        });
        continue;
      }
      try {
        logger.debug("tool call", { name: use.name });
        const result = await tool.execute(use.input as never, ctx);
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content:
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content),
          is_error: result.isError ?? false,
        });
      } catch (err) {
        logger.error("tool execution threw", { name: use.name, err: String(err) });
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: "אירעה שגיאה בהפעלת הכלי.",
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    finalText = "מצטער/ת, לא הצלחתי להשלים את הבקשה. אפשר לנסות שוב או לפנות לצוות.";
  }

  return { text: finalText, messages, toolsUsed };
}
