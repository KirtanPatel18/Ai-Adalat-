/**
 * router/router.test.ts
 * Owner: Yug Gandhi (LLM Router)
 *
 * Tests for the LLM Router — resolve() and run() with stubbed providers.
 */

import { describe, it, expect, vi } from "vitest";
import { LLMRouter } from "./index.js";
import { ROUTER_CONFIG } from "./router.config.js";

describe("LLMRouter.resolve()", () => {
  const router = new LLMRouter();

  it("resolves planner to claude provider", () => {
    const config = router.resolve("planner");
    expect(config.provider).toBe("claude");
  });

  it("resolves reviewer to gemini provider (stubbed)", () => {
    const config = router.resolve("reviewer");
    expect(config.provider).toBe("gemini");
  });

  it("falls back to default config for unknown steps", () => {
    const config = router.resolve("unknown_step_xyz");
    expect(config.provider).toBe("claude");
  });

  it("all configured steps have a valid provider", () => {
    const validProviders = ["claude", "gemini", "gpt"];
    for (const [step, cfg] of Object.entries(ROUTER_CONFIG)) {
      expect(validProviders).toContain(cfg.provider);
    }
  });
});

describe("LLMRouter.run() — stubbed providers", () => {
  const router = new LLMRouter();

  it("run() for a gemini step returns a mock LLMResponse shape", async () => {
    // Gemini is stubbed so no real API call is made
    const res = await router.run("reviewer", "You are a reviewer.", "Review this draft.");
    expect(res).toHaveProperty("text");
    expect(res).toHaveProperty("tokens_in");
    expect(res).toHaveProperty("tokens_out");
    expect(res).toHaveProperty("cost_usd");
    expect(res).toHaveProperty("latency_ms");
    expect(typeof res.text).toBe("string");
  });
});
