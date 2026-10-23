/**
 * Smoke test for the Claude client (2.10): one tiny call, logged in `ai_calls`.
 *
 *   npm run ai:smoke
 *
 * Uses `.env.local` (ANTHROPIC_API_KEY + the Neon `dev` branch). Costs a fraction
 * of a cent. Runs with `--conditions=react-server` so the `server-only` modules
 * can be imported outside Next.js.
 */
import { desc } from "drizzle-orm";
import { z } from "zod";

import { callClaude } from "@/ai/client";
import { CLAUDE_MODEL } from "@/ai/model";
import { aiCalls, db } from "@/db";

const Answer = z.object({
  word: z.string(),
  question: z.string(),
});

async function main() {
  console.log(`Calling ${CLAUDE_MODEL}…`);

  const { output: answer } = await callClaude({
    kind: "explain",
    postId: null,
    schema: Answer,
    maxTokens: 2000,
    effort: "low",
    messages: [
      {
        role: "user",
        content:
          'Give the English word "thrilled" back in `word`, and one short example ' +
          "question that uses it in `question`.",
      },
    ],
  });
  console.log("Answer:", answer);

  const [logged] = await db.select().from(aiCalls).orderBy(desc(aiCalls.createdAt)).limit(1);
  console.log("Logged in ai_calls:", {
    kind: logged?.kind,
    model: logged?.model,
    inputTokens: logged?.inputTokens,
    outputTokens: logged?.outputTokens,
    durationMs: logged?.durationMs,
    success: logged?.success,
  });
}

main().catch((error: unknown) => {
  console.error("Smoke test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
