import { describe, it, expect, vi } from "vitest";
import { runCitator } from "./index.js";
import type { DocumentDraft } from "@trionic/shared";

// Mock router to avoid network calls
vi.mock("../router/index.js", () => ({
  router: {
    run: vi.fn(),
  },
}));

// Mock tracing to capture traces without real persistence
vi.mock("../tracing/index.js", () => ({
  buildTrace: vi.fn((input) => ({ ...input.llmResponse, agent: input.agent, cited_nodes: input.cited_nodes, status: input.status, timestamp: new Date().toISOString() })),
  buildErrorTrace: vi.fn((agent, error) => ({ agent, status: "error", error_message: String(error), timestamp: new Date().toISOString() })),
  persistTrace: vi.fn().mockResolvedValue(undefined),
}));

const { router } = await import("../router/index.js");

const baseDraft: DocumentDraft = {
  id: "d1",
  document_type: "rti_application",
  language: "en",
  content: "This is a test draft with a citation.",
  citations: [
    { node_id: "ICA-1872/CH-VI/S-73", snapshot_id: "2024-12-01", span: [10, 20] },
  ],
  traces: [],
  created_at: new Date().toISOString(),
};

describe("runCitator()", () => {
  it("returns passed=true for valid LLM output and local validation", async () => {
    (router.run as any).mockResolvedValueOnce({
      text: JSON.stringify({
        passed: true,
        validatedCitations: baseDraft.citations,
      }),
      model: "claude-3-5-sonnet-20241022",
      tokens_in: 50,
      tokens_out: 20,
      cost_usd: 0.0005,
      latency_ms: 300,
    });

    const res = await runCitator({ draft: baseDraft, session_id: "s1" });
    expect(res.passed).toBe(true);
    expect(Array.isArray(res.validatedCitations)).toBe(true);
    expect(res.trace.status).toBe("ok");
  });

  it("returns passed=false when LLM explicitly rejects with reason", async () => {
    (router.run as any).mockResolvedValueOnce({
      text: JSON.stringify({
        passed: false,
        validatedCitations: [],
        rejection_reason: "Citation missing snapshot_id",
      }),
      model: "claude-3-5-sonnet-20241022",
      tokens_in: 30,
      tokens_out: 10,
      cost_usd: 0.0002,
      latency_ms: 200,
    });

    const res = await runCitator({ draft: baseDraft });
    expect(res.passed).toBe(false);
    expect(res.rejection_reason).toBeDefined();
    expect(res.trace.status).toBe("rejected");
  });

  it("throws and emits error trace when LLM returns invalid JSON", async () => {
    (router.run as any).mockResolvedValueOnce({
      text: "NOT A JSON",
      model: "claude-3-5-sonnet-20241022",
      tokens_in: 10,
      tokens_out: 5,
      cost_usd: 0.0001,
      latency_ms: 100,
    });

    await expect(runCitator({ draft: baseDraft })).rejects.toThrow();
    // thrown error should have a trace attached by implementation
  });
});
