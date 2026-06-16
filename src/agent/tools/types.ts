/**
 * Tool framework types.
 *
 * Each tool declares its Anthropic-facing JSON schema plus a typed `execute`
 * handler that the engine invokes. Tools that perform hard-to-reverse actions
 * set `sensitive: true` so the engine can require explicit confirmation before
 * running them (see engine.ts and the system prompt).
 */
import type Anthropic from "@anthropic-ai/sdk";

/** Per-request context handed to every tool. Carries identity, not secrets. */
export interface ToolContext {
  conversationId: string | null;
  patientId: string | null;
  /** IANA timezone for interpreting/formatting times. */
  timezone: string;
}

export interface ToolResult {
  /** Sent back to Claude as the tool_result content (stringified if object). */
  content: unknown;
  isError?: boolean;
}

export interface Tool<Input = Record<string, unknown>> {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
  /**
   * Hard-to-reverse, outward-facing actions (booking, cancelling, contacting a
   * person) are marked sensitive. The system prompt instructs the model to
   * confirm with the user before calling these.
   */
  sensitive?: boolean;
  execute(input: Input, ctx: ToolContext): Promise<ToolResult>;
}

/** Anthropic tool definition derived from a Tool. */
export function toAnthropicTool(tool: Tool): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
  };
}
