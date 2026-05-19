/**
 * providers/gemini.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * Gemini (Google) provider — STUBBED in Week 1.
 * TODO (Week 2): Wire real @google/generative-ai SDK calls.
 *
 * Requires GEMINI_API_KEY in environment when un-stubbed.
 */

import type { LLMRequest, LLMResponse } from "../index.js";

/**
 * STUB: Returns a mock response without hitting the Gemini API.
 * Replace the body of this function in Week 2 with real SDK calls.
 */
export async function callGemini(req: LLMRequest): Promise<LLMResponse> {
  console.warn(
    `[GeminiProvider] STUB — model "${req.model}" was requested but Gemini is not yet wired. Returning mock response.`
  );

  // Simulate realistic latency so downstream timing tests don't break
  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    text: `[GEMINI STUB] Mock response for prompt: "${req.userPrompt.slice(0, 80)}..."`,
    model: req.model,
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    latency_ms: 50,
  };

  // ─── TODO (Week 2): Real implementation ─────────────────────────────────
  // import { GoogleGenerativeAI } from "@google/generative-ai";
  // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  // const model = genAI.getGenerativeModel({ model: req.model });
  // const result = await model.generateContent([req.systemPrompt, req.userPrompt]);
  // return { text: result.response.text(), ... };
  // ────────────────────────────────────────────────────────────────────────
}
