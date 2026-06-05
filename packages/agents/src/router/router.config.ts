/**
 * router.config.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * Maps each agent step to its preferred LLM provider + model.
 * Change the values here to reroute any agent to a different model —
 * no code changes required in the agents themselves.
 */

export type ModelProvider = "claude" | "gemini" | "gpt" | "deepseek";

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

export interface StepRouteConfig {
  /** The primary model that should handle this step under normal circumstances. */
  preferred: ModelConfig;
  /** The backup model to call if the primary model fails. */
  fallback?: ModelConfig;
}

/**
 * Step-to-model routing table.
 * Key = agent step name (matches agent.ts export names).
 * Value = step route config for that step (preferred + fallback).
 */
export const ROUTER_CONFIG: Record<string, StepRouteConfig> = {
  classifier: {
    preferred: {
      provider: "gemini",
      model: "gemini-1.5-flash",
      maxTokens: 512,
      temperature: 0.1,
    },
    fallback: {
      provider: "gpt",
      model: "gpt-4o-mini",
      maxTokens: 512,
      temperature: 0.1,
    }
  },
  planner: {
    preferred: {
      provider: "claude",
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 1024,
      temperature: 0.2,
    },
    fallback: {
      provider: "gemini",
      model: "gemini-1.5-pro",
      maxTokens: 1024,
      temperature: 0.2,
    }
  },
  drafter: {
    preferred: {
      provider: "deepseek",
      model: "deepseek-chat",
      maxTokens: 4096,
      temperature: 0.3,
    },
    fallback: {
      provider: "claude",
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 4096,
      temperature: 0.3,
    }
  },
  citator: {
    preferred: {
      provider: "claude",
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 512,
      temperature: 0.0,
    },
    fallback: {
      provider: "gemini",
      model: "gemini-1.5-pro",
      maxTokens: 512,
      temperature: 0.0,
    }
  },
  reviewer: {
    preferred: {
      provider: "gemini",
      model: "gemini-1.5-pro",
      maxTokens: 1024,
      temperature: 0.2,
    },
    fallback: {
      provider: "gpt",
      model: "gpt-4o",
      maxTokens: 1024,
      temperature: 0.2,
    }
  },
  translator: {
    preferred: {
      provider: "gemini",
      model: "gemini-1.5-pro",
      maxTokens: 2048,
      temperature: 0.1,
    },
    fallback: {
      provider: "gpt",
      model: "gpt-4o",
      maxTokens: 2048,
      temperature: 0.1,
    }
  },
};

/** Default config used if a step is not found in ROUTER_CONFIG. */
export const DEFAULT_ROUTE_CONFIG: StepRouteConfig = {
  preferred: {
    provider: "claude",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 1024,
    temperature: 0.2,
  }
};

