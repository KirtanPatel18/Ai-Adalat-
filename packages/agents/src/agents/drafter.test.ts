import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock router to avoid network calls
vi.mock("../router/index.js", () => ({
  router: {
    run: vi.fn(),
  },
}));

import { runDrafterAgent, DrafterAgent } from "./drafter.js";
import type { PlannerOutput } from "@trionic/shared";

const mockPlan: PlannerOutput = {
  document_type: "consumer_complaint",
  template_id: "tmpl-consumer-complaint-v1",
  pageindex_queries: ["CPA-2019 Section 2"],
  applicable_acts: ["CPA-2019"],
  notes: "Draft a complaint",
};

const mockNodes = [
  { node_id: "CPA-2019/CH-I/S-2", text: "Mock text for node 2" },
];

const mockLlmResponse = {
  text: "Draft content with [CITE:CPA-2019/CH-I/S-2] citation.",
  model: "claude-3-5-sonnet-20241022",
  provider: "claude" as const,
  tokens_in: 300,
  tokens_out: 700,
  cost_usd: 0.003,
  latency_ms: 1000,
  fallback_used: false,
};

describe("DrafterAgentV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the LLM router and extracts citations", async () => {
    const { router } = await import("../router/index.js");
    vi.mocked(router.run).mockResolvedValueOnce(mockLlmResponse);

    const result = await runDrafterAgent({
      plan: mockPlan,
      retrievedNodes: mockNodes,
    });

    expect(result.body_markdown).toBe(mockLlmResponse.text);
    expect(result.pending_citations).toEqual(["CPA-2019/CH-I/S-2"]);
    expect(router.run).toHaveBeenCalledWith(
      "drafter",
      expect.any(String),
      expect.stringContaining("Retrieved Legal Sections from PageIndex")
    );
  });

  it("exposes the class DrafterAgent with run method", async () => {
    const { router } = await import("../router/index.js");
    vi.mocked(router.run).mockResolvedValueOnce(mockLlmResponse);

    const agent = new DrafterAgent();
    expect(agent.name).toBe("drafter");

    const result = await agent.run({
      plan: mockPlan,
      retrievedNodes: mockNodes,
    });

    expect(result.body_markdown).toBe(mockLlmResponse.text);
    expect(result.pending_citations).toEqual(["CPA-2019/CH-I/S-2"]);
  });
});
