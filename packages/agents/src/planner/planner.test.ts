/**
 * planner/planner.test.ts
 * Owner: Malay Sheta (Planner agent)
 */

import { describe, it, expect, vi } from "vitest";
import { runPlanner } from "./index.js";
import type { ClassifierOutput } from "@trionic/shared";

// Mock the router so no real API call is made in tests
vi.mock("../router/index.js", () => ({
  router: {
    run: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        document_type: "consumer_complaint",
        template_id: "consumer-complaint-v1",
        pageindex_queries: ["CPA-2019 Section 35 — consumer forum jurisdiction"],
        applicable_acts: ["CPA-2019"],
        notes: "Focus on deficiency of service claim.",
      }),
      model: "claude-3-5-sonnet-20241022",
      tokens_in: 200,
      tokens_out: 80,
      cost_usd: 0.001,
      latency_ms: 800,
    }),
  },
}));

vi.mock("../tracing/index.js", () => ({
  buildTrace: vi.fn((input) => ({ ...input.llmResponse, agent: input.agent, cited_nodes: [], status: input.status, timestamp: new Date().toISOString() })),
  buildErrorTrace: vi.fn((agent, error) => ({ agent, status: "error", error_message: String(error), timestamp: new Date().toISOString() })),
  persistTrace: vi.fn().mockResolvedValue(undefined),
}));

const mockClassifier: ClassifierOutput = {
  is_legal: true,
  domain: "consumer_protection",
  relevant_acts: ["CPA-2019"],
  confidence: 0.92,
  reasoning: "User is describing a deficiency of service by an e-commerce seller.",
};

describe("runPlanner()", () => {
  it("returns a PlannerResult with valid plan and trace", async () => {
    const result = await runPlanner({
      intakeText: "I ordered a product online but it was defective and the seller is not responding.",
      classifierOutput: mockClassifier,
      language: "en",
      session_id: "test-session-001",
    });

    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("trace");
    expect(result.plan.document_type).toBe("consumer_complaint");
    expect(result.plan.applicable_acts).toContain("CPA-2019");
    expect(Array.isArray(result.plan.pageindex_queries)).toBe(true);
  });

  it("trace has status ok", async () => {
    const result = await runPlanner({
      intakeText: "Test intake",
      classifierOutput: mockClassifier,
      language: "en",
    });
    expect(result.trace.status).toBe("ok");
  });
});
