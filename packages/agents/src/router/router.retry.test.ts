/**
 * router/router.retry.test.ts
 *
 * Tests for the single retry of transient Gemini errors (503 / 429 / high demand)
 * in LLMRouter.run(). The reviewer step routes to Gemini with no fallback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMRouter } from "./index.js";
import { callGemini } from "./providers/gemini.js";

vi.mock("./providers/claude.js", () => ({ callClaude: vi.fn() }));
vi.mock("./providers/gemini.js", () => ({ callGemini: vi.fn() }));
vi.mock("./providers/gpt.js", () => ({ callGPT: vi.fn() }));
vi.mock("./providers/deepseek.js", () => ({ callDeepSeek: vi.fn() }));

const OK_RESPONSE = {
  text: "gemini ok after retry",
  model: "gemini-3.1-flash-lite",
  provider: "gemini" as const,
  tokens_in: 10,
  tokens_out: 20,
  cost_usd: 0.0001,
  latency_ms: 100,
  fallback_used: false,
};

const OVERLOADED = new Error(
  "[GoogleGenerativeAI Error]: [503 Service Unavailable] This model is currently experiencing high demand."
);

describe("LLMRouter transient Gemini retry", () => {
  // 0 ms pause so the tests run instantly
  const router = new LLMRouter(0);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries once on a 503 and returns the second response", async () => {
    vi.mocked(callGemini)
      .mockRejectedValueOnce(OVERLOADED)
      .mockResolvedValueOnce(OK_RESPONSE);

    const res = await router.run("reviewer", "system", "user");

    expect(res.text).toBe("gemini ok after retry");
    expect(res.provider).toBe("gemini");
    expect(res.fallback_used).toBe(false);
    expect(callGemini).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent error", async () => {
    vi.mocked(callGemini).mockRejectedValueOnce(new Error("API key not valid"));

    await expect(router.run("reviewer", "system", "user")).rejects.toThrow(
      "API key not valid"
    );
    expect(callGemini).toHaveBeenCalledTimes(1);
  });

  it("gives up after a single retry when the 503 persists", async () => {
    vi.mocked(callGemini)
      .mockRejectedValueOnce(OVERLOADED)
      .mockRejectedValueOnce(OVERLOADED);

    await expect(router.run("reviewer", "system", "user")).rejects.toThrow(
      "503 Service Unavailable"
    );
    expect(callGemini).toHaveBeenCalledTimes(2);
  });
});