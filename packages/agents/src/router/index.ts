/**
 * router/index.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * The LLM Router is the single point through which ALL agent LLM calls flow.
 * Agents never import provider SDKs directly — they call `router.run(step, prompt)`.
 *
 * Week 1 status:
 *   ✅ Claude — FUNCTIONAL (needs ANTHROPIC_API_KEY)
 *   🔲 Gemini — STUBBED
 *   🔲 GPT    — STUBBED
 */

import { ROUTER_CONFIG, DEFAULT_MODEL_CONFIG, type ModelConfig } from "./router.config.js";
import { callClaude } from "./providers/claude.js";
import { callGemini } from "./providers/gemini.js";
import { callGPT } from "./providers/gpt.js";

// ─── Public Types ─────────────────────────────────────────────────────────────

/** Input to any provider call — the common contract. */
export interface LLMRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

/** Output from any provider call — the common contract. */
export interface LLMResponse {
  /** The raw text completion returned by the model. */
  text: string;
  /** Fully-qualified model string actually used. */
  model: string;
  /** Prompt tokens consumed. */
  tokens_in: number;
  /** Completion tokens produced. */
  tokens_out: number;
  /** Estimated cost in USD. */
  cost_usd: number;
  /** Wall-clock latency of the API call in ms. */
  latency_ms: number;
}

// ─── LLMRouter ───────────────────────────────────────────────────────────────

export class LLMRouter {
  /**
   * Resolve the ModelConfig for a given agent step.
   * Reads from ROUTER_CONFIG; falls back to DEFAULT_MODEL_CONFIG.
   */
  resolve(step: string): ModelConfig {
    return ROUTER_CONFIG[step] ?? DEFAULT_MODEL_CONFIG;
  }

  /**
   * Run a prompt through the LLM resolved for the given step.
   *
   * @param step       - Agent step name (e.g. "planner", "drafter").
   * @param systemPrompt - System / instruction prompt.
   * @param userPrompt   - The user-facing content or task for this step.
   * @returns LLMResponse with text, usage, cost, latency.
   */
  async run(
    step: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    const config = this.resolve(step);

    const req: LLMRequest = {
      model: config.model,
      systemPrompt,
      userPrompt,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    };

    switch (config.provider) {
      case "claude":
        return callClaude(req);
      case "gemini":
        return callGemini(req);
      case "gpt":
        return callGPT(req);
      default:
        throw new Error(`[LLMRouter] Unknown provider: ${config.provider}`);
    }
  }
}

/** Singleton router instance — import and use this everywhere. */
export const router = new LLMRouter();
