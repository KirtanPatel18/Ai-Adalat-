/**
 * router.config.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * Maps each agent step to its preferred LLM provider + model.
 * Change the values here to reroute any agent to a different model —
 * no code changes required in the agents themselves.
 */

export type ModelProvider = "claude" | "gemini" | "gpt";

export interface ModelConfig {
  /** Which provider to use. */
  provider: ModelProvider;
  /** Exact model string to pass to the provider SDK. */
  model: string;
  /** Max tokens for the completion. */
  maxTokens: number;
  /** Temperature (0 = deterministic, 1 = creative). Legal drafts want low temp. */
  temperature: number;
}

/**
 * Step-to-model routing table.
 * Key = agent step name (matches agent.ts export names).
 * Value = model config for that step.
 *
 * Week 1: Claude is LIVE. Gemini + GPT are STUBBED (return mock responses).
 */
export const ROUTER_CONFIG: Record<string, ModelConfig> = {
  planner: {
    provider: "claude",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 1024,
    temperature: 0.2,
  },
  classifier: {
    provider: "claude",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 512,
    temperature: 0.1,
  },
  drafter: {
    provider: "claude",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 4096,
    temperature: 0.3,
  },
  citator: {
    // Citator is pure logic — no LLM needed for validation.
    // If an LLM fallback is required, it uses Claude.
    provider: "claude",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 256,
    temperature: 0.0,
  },
  reviewer: {
    provider: "gemini",                    // STUBBED — Week 1
    model: "gemini-1.5-pro",
    maxTokens: 1024,
    temperature: 0.2,
  },
  translator: {
    provider: "gemini",                    // STUBBED — Week 1
    model: "gemini-1.5-pro",
    maxTokens: 2048,
    temperature: 0.1,
  },
};

/** Fallback config used if a step is not found in ROUTER_CONFIG. */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: "claude",
  model: "claude-3-5-sonnet-20241022",
  maxTokens: 1024,
  temperature: 0.2,
};
