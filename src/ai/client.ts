import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import { aiCalls, db } from "@/db";
import { env } from "@/lib/env";

import { CLAUDE_MODEL } from "./model";

/**
 * Anthropic client. The key comes from the validated server env and never
 * leaves the server.
 *
 * Timeout and retries keep a whole call (first try + 1 retry) under Vercel's
 * 300 s function limit (feasibility §11).
 */
const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  timeout: 120_000,
  maxRetries: 1,
});

/** Server-side retry on another model when the safety classifiers decline. */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export type AiCallKind = (typeof aiCalls.$inferInsert)["kind"];
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type CallClaudeOptions<Schema extends z.ZodType> = {
  /** Which call this is, as logged in `ai_calls.kind`. */
  kind: AiCallKind;
  /** Post the call works on. Null for calls that belong to no post (smoke test). */
  postId: string | null;
  /** Shape of the answer, enforced by structured outputs (D-07). */
  schema: Schema;
  /** Hard cap on output tokens (feasibility §9.5). Required on every call. */
  maxTokens: number;
  system?: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  /** Thinking depth and token spend. The model's default is `high`. */
  effort?: Effort;
};

/** A validated answer and the model that actually produced it (a fallback may have answered). */
export type ClaudeResult<Output> = { output: Output; model: string };

export class ClaudeCallError extends Error {
  override name = "ClaudeCallError";
}

/**
 * One Claude call with a JSON-schema answer, logged in `ai_calls`.
 *
 * Every call writes exactly one `ai_calls` row, success or failure (E-04), with
 * the model that actually answered, the token usage and the duration. Failures
 * are re-thrown so the caller can store `posts.last_error` and offer Retry.
 */
export async function callClaude<Schema extends z.ZodType>(
  options: CallClaudeOptions<Schema>,
): Promise<ClaudeResult<z.infer<Schema>>> {
  const started = performance.now();
  let model: string = CLAUDE_MODEL;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    // `create` (not `parse`) so usage and stop_reason are read before the JSON:
    // a cut-off answer is still logged with the tokens it cost.
    const response = await anthropic.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: options.maxTokens,
      ...(options.system ? { system: options.system } : {}),
      messages: options.messages,
      output_config: {
        format: betaZodOutputFormat(options.schema),
        ...(options.effort ? { effort: options.effort } : {}),
      },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });

    model = response.model;
    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;

    if (response.stop_reason === "refusal") {
      const category = response.stop_details?.category ?? "unspecified";
      throw new ClaudeCallError(`Claude declined the request (category: ${category}).`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new ClaudeCallError(
        `The answer was cut off at max_tokens (${options.maxTokens}). Raise the cap for this call.`,
      );
    }
    const output = parseAnswer(response.content, options.schema);

    await logCall(options, { model, inputTokens, outputTokens, started, error: null });
    return { output, model };
  } catch (error) {
    const message = describeError(error);
    await logCall(options, { model, inputTokens, outputTokens, started, error: message });
    throw error instanceof ClaudeCallError ? error : new ClaudeCallError(message, { cause: error });
  }
}

/** Reads the JSON text block and validates it against the schema (feasibility §11). */
function parseAnswer<Schema extends z.ZodType>(
  content: Anthropic.Beta.BetaContentBlock[],
  schema: Schema,
): z.infer<Schema> {
  const text = content.find((block) => block.type === "text")?.text;
  if (!text) throw new ClaudeCallError("Claude returned no text block.");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ClaudeCallError("Claude returned invalid JSON.");
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ClaudeCallError(`Claude's answer does not match the schema: ${result.error.message}`);
  }
  return result.data;
}

async function logCall(
  options: Pick<CallClaudeOptions<z.ZodType>, "kind" | "postId">,
  result: {
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    started: number;
    error: string | null;
  },
) {
  const row = {
    postId: options.postId,
    kind: options.kind,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: Math.round(performance.now() - result.started),
    success: result.error === null,
    error: result.error,
  };
  try {
    await db.insert(aiCalls).values(row);
  } catch {
    // The post may have been deleted during the call (a cancelled draft): keep
    // the cost history without the link, as ON DELETE SET NULL would have.
    await db
      .insert(aiCalls)
      .values({ ...row, postId: null })
      .catch((error: unknown) => {
        console.error("Could not log the Claude call:", error);
      });
  }
}

function describeError(error: unknown): string {
  if (error instanceof ClaudeCallError) return error.message;
  if (error instanceof Anthropic.APIError) {
    // The API's own message ("invalid x-api-key"), not the raw JSON body.
    const body: unknown = error.error;
    const apiMessage =
      typeof body === "object" && body !== null && "error" in body
        ? (body.error as { message?: unknown }).message
        : undefined;
    const message = typeof apiMessage === "string" ? apiMessage : error.message;
    return `Claude API error ${error.status ?? "(no status)"}: ${message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
