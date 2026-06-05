/**
 * router/router.test.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * Tests for the LLM Router — resolve() and run() with resilient fallbacks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMRouter } from "./index.js";
import { ROUTER_CONFIG } from "./router.config.js";
import { callClaude } from "./providers/claude.js";
import { callGemini } from "./providers/gemini.js";
import { callGPT } from "./providers/gpt.js";
import { callDeepSeek } from "./providers/deepseek.js";

vi.mock("./providers/claude.js", () => ({
  callClaude: vi.fn(),
}));

vi.mock("./providers/gemini.js", () => ({
  callGemini: vi.fn(),
}));

vi.mock("./providers/gpt.js", () => ({
  callGPT: vi.fn(),
}));

vi.mock("./providers/deepseek.js", () => ({
  callDeepSeek: vi.fn(),
}));

describe("LLMRouter.resolve()", () => {
  const router = new LLMRouter();

  it("resolves planner to claude provider preferred", () => {
    const config = router.resolve("planner");
    expect(config.preferred.provider).toBe("claude");
  });

  it("resolves reviewer to gemini provider preferred", () => {
    const config = router.resolve("reviewer");
    expect(config.preferred.provider).toBe("gemini");
  });

  it("falls back to default config for unknown steps", () => {
    const config = router.resolve("unknown_step_xyz");
    expect(config.preferred.provider).toBe("claude");
  });

  it("all configured steps have a valid provider", () => {
    const validProviders = ["claude", "gemini", "gpt", "deepseek"];
    for (const [_, cfg] of Object.entries(ROUTER_CONFIG)) {
      expect(validProviders).toContain(cfg.preferred.provider);
      if (cfg.fallback) {
        expect(validProviders).toContain(cfg.fallback.provider);
      }
    }
  });
});

describe("LLMRouter.run() with mock providers", () => {
  const router = new LLMRouter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes the preferred model successfully", async () => {
    vi.mocked(callGemini).mockResolvedValueOnce({
      text: "gemini success",
      model: "gemini-1.5-pro",
      provider: "gemini",
      tokens_in: 10,
      tokens_out: 20,
      cost_usd: 0.0001,
      latency_ms: 100,
      fallback_used: false,
    });

    const res = await router.run("reviewer", "You are reviewer", "Review draft");
    expect(res.text).toBe("gemini success");
    expect(res.provider).toBe("gemini");
    expect(res.fallback_used).toBe(false);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGPT).not.toHaveBeenCalled();
  });

  it("fails over to the fallback model if preferred fails", async () => {
    // Preferred (gemini) fails
    vi.mocked(callGemini).mockRejectedValueOnce(new Error("Gemini quota exceeded"));
    // Fallback (gpt) succeeds
    vi.mocked(callGPT).mockResolvedValueOnce({
      text: "gpt success",
      model: "gpt-4o",
      provider: "gpt",
      tokens_in: 15,
      tokens_out: 25,
      cost_usd: 0.0002,
      latency_ms: 150,
      fallback_used: false,
    });

    const res = await router.run("reviewer", "You are reviewer", "Review draft");
    expect(res.text).toBe("gpt success");
    expect(res.provider).toBe("gpt");
    expect(res.fallback_used).toBe(true);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGPT).toHaveBeenCalledTimes(1);
  });

  it("throws a cumulative error if both preferred and fallback fail", async () => {
    vi.mocked(callGemini).mockRejectedValueOnce(new Error("Gemini quota exceeded"));
    vi.mocked(callGPT).mockRejectedValueOnce(new Error("GPT rate limit"));

    await expect(
      router.run("reviewer", "You are reviewer", "Review draft")
    ).rejects.toThrow("Both preferred and fallback models failed for step \"reviewer\"");
  });
});
