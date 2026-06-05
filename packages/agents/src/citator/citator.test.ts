import { describe, it, expect, vi, beforeEach } from "vitest";
import { runCitator } from "./index.js";
import type { DocumentDraft } from "@trionic/shared";
import { NodeNotFoundError } from "./pageindex.js";

vi.mock("./pageindex.js", () => ({
  get_text: vi.fn(),
  NodeNotFoundError: class NodeNotFoundError extends Error {},
}));

vi.mock("./events.js", () => ({
  emitAgentStreamEvent: vi.fn(),
}));

vi.mock("../tracing/index.js", () => ({
  buildTrace: vi.fn((input) => ({ ...input.llmResponse, agent: input.agent, cited_nodes: input.cited_nodes, status: input.status, timestamp: new Date().toISOString() })),
  buildErrorTrace: vi.fn((agent, error) => ({ agent, status: "error", error_message: String(error), timestamp: new Date().toISOString() })),
  persistTrace: vi.fn().mockResolvedValue(undefined),
}));

const { get_text } = await import("./pageindex.js");

const baseDraft: DocumentDraft = {
  id: "d1",
  document_type: "rti_application",
  language: "en",
  content: "RTI requires disclosure [CITE:ICA-1872/CH-VI/S-73] in this clause.",
  citations: [
    { node_id: "ICA-1872/CH-VI/S-73", snapshot_id: "2024-12-01", span: [0, 45] },
  ],
  traces: [],
  created_at: new Date().toISOString(),
};

describe("runCitator()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves drafts when every citation node exists", async () => {
    (get_text as any).mockResolvedValueOnce({
      node_id: "ICA-1872/CH-VI/S-73",
      snapshot_id: "2024-12-01",
      text: "Some legal text",
    });

    const res = await runCitator({ draft: baseDraft, session_id: "s1" });

    expect(res.approved).toBe(true);
    expect(res.passed).toBe(true);
    expect(res.validatedCitations).toHaveLength(1);
    expect(res.resolved_citations[0].node_id).toBe("ICA-1872/CH-VI/S-73");
    expect(res.rejected_spans).toEqual([]);
    expect(res.trace.status).toBe("ok");
  });

  it("rejects drafts when a citation node does not exist", async () => {
    (get_text as any).mockRejectedValueOnce(new NodeNotFoundError("ICA-1872/CH-VI/S-999"));

    const content = "RTI requires disclosure [CITE:ICA-1872/CH-VI/S-999].";
    const draft: DocumentDraft = {
      ...baseDraft,
      content,
      citations: [],
    };

    const res = await runCitator({ draft, session_id: "s2" });

    expect(res.approved).toBe(false);
    expect(res.passed).toBe(false);
    expect(res.validatedCitations).toEqual([]);
    expect(res.resolved_citations).toEqual([]);
    expect(res.rejected_spans).toHaveLength(1);
    expect(res.rejection_reason).toBeDefined();
    expect(res.trace.status).toBe("rejected");
  });
});
