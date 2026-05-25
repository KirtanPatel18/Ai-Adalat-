/**
 * providers/gpt.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * GPT (OpenAI) provider — STUBBED in Week 1.
 * TODO (Week 2): Wire real openai SDK calls.
 *
 * Requires OPENAI_API_KEY in environment when un-stubbed.
 */

import type { LLMRequest, LLMResponse } from "../index.js";

/**
 * STUB: Returns a mock response without hitting the OpenAI API.
 * Replace the body of this function in Week 2 with real SDK calls.
 */
export async function callGPT(req: LLMRequest): Promise<LLMResponse> {
  console.warn(
    `[GPTProvider] STUB — model "${req.model}" was requested but GPT is not yet wired. Returning mock response.`
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    text: `[GPT STUB] Mock response for prompt: "${req.userPrompt.slice(0, 80)}..."`,
    model: req.model,
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    latency_ms: 50,
  };

  // ─── TODO (Week 2): Real implementation ─────────────────────────────────
  // import OpenAI from "openai";
  // const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const completion = await client.chat.completions.create({
  //   model: req.model,
  //   messages: [
  //     { role: "system", content: req.systemPrompt },
  //     { role: "user",   content: req.userPrompt },
  //   ],
  //   max_tokens: req.maxTokens,
  //   temperature: req.temperature,
  // });
  // return { text: completion.choices[0].message.content ?? "", ... };
  // ────────────────────────────────────────────────────────────────────────
}
