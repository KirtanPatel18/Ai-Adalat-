/**
 * chain.retry.test.ts
 *
 * Tests the one-shot Citator retry in runAgentChain:
 *   citator rejects -> reviseDraft once with the bad node IDs -> re-validate
 *   -> continue if it passes, fail with step.error if it still rejects.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentStreamEvent, AgentTrace, Citation, DocumentDraft } from "@trionic/shared";
import { InMemoryStore } from "./memory.js";
import { runAgentChain, type ChainInput } from "./chain.js";

const { MOCK_TRACE, MOCK_CITATION, MOCK_DRAFT, REVISED_DRAFT, REJECTED, PASSED } = vi.hoisted(() => {
  const MOCK_TRACE: AgentTrace = {
    agent: "test",
    model: "test-model",
    tokens_in: 100,
    tokens_out: 200,
    cost_usd: 0.01,
    latency_ms: 500,
    cited_nodes: [],
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  const MOCK_CITATION: Citation = {
    node_id: "ICA-1872/CH-II/S-10",
    snapshot_id: "2024-12-01",
    span: [0, 10],
  };

  const MOCK_DRAFT: DocumentDraft = {
    id: "draft-1",
    document_type: "nda",
    language: "en",
    content: "# NDA\n\nUnder Section 999 of the Contract Act [CITE:ICA-1872/CH-II/S-999].",
    citations: [],
    traces: [],
    created_at: new Date().toISOString(),
  };

  const REVISED_DRAFT: DocumentDraft = {
    ...MOCK_DRAFT,
    id: "draft-2",
    content: "# NDA\n\nUnder Section 10 of the Contract Act [CITE:ICA-1872/CH-II/S-10].",
  };

  const REJECTED = {
    passed: false,
    approved: false,
    validatedCitations: [],
    rejection_reason: "One or more [CITE:...] markers reference node IDs that do not exist in PageIndex.",
    verdict: {
      approved: false,
      rejected_spans: [
        {
          span: [0, 70],
          reason: "invalid_node",
          message: "PageIndex node not found: ICA-1872/CH-II/S-999",
        },
      ],
      resolved_citations: [],
    },
    trace: { ...MOCK_TRACE, agent: "citator", status: "rejected" },
  };

  const PASSED = {
    passed: true,
    approved: true,
    validatedCitations: [MOCK_CITATION],
    verdict: { approved: true, rejected_spans: [], resolved_citations: [MOCK_CITATION] },
    trace: { ...MOCK_TRACE, agent: "citator" },
  };

  return { MOCK_TRACE, MOCK_CITATION, MOCK_DRAFT, REVISED_DRAFT, REJECTED, PASSED };
});

vi.mock("./classifier/index.js", () => ({
  runClassifier: vi.fn().mockResolvedValue({
    classification: {
      is_legal: true,
      domain: "commercial",
      relevant_acts: ["ICA-1872"],
      severity: "medium",
      confidence: 0.95,
      reasoning: "NDA",
    },
    trace: { ...MOCK_TRACE, agent: "classifier" },
  }),
}));

vi.mock("./planner/index.js", () => ({
  runPlanner: vi.fn().mockResolvedValue({
    plan: {
      document_type: "nda",
      template_id: "nda-v1",
      pageindex_queries: ["Indian Contract Act Section 10"],
      applicable_acts: ["ICA-1872"],
      notes: "",
    },
    trace: { ...MOCK_TRACE, agent: "planner" },
  }),
}));

vi.mock("./drafter/index.js", () => ({
  runDrafter: vi.fn().mockResolvedValue({
    draft: MOCK_DRAFT,
    trace: { ...MOCK_TRACE, agent: "drafter" },
  }),
  reviseDraft: vi.fn(),
}));

vi.mock("./citator/index.js", () => ({
  runCitator: vi.fn().mockResolvedValue(PASSED),
}));

vi.mock("./reviewer/index.js", () => ({
  runReviewer: vi.fn().mockResolvedValue({
    approved: true,
    feedback: "ok",
    trace: { ...MOCK_TRACE, agent: "reviewer" },
  }),
}));

vi.mock("./translator/index.js", () => ({
  runTranslator: vi.fn(),
}));

vi.mock("./tracing/index.js", () => ({
  persistTrace: vi.fn().mockResolvedValue(undefined),
  buildTrace: vi.fn().mockReturnValue(MOCK_TRACE),
  buildErrorTrace: vi.fn().mockReturnValue({ ...MOCK_TRACE, status: "error" }),
}));

async function collectEvents(gen: AsyncGenerator<AgentStreamEvent>): Promise<AgentStreamEvent[]> {
  const events: AgentStreamEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

function eventsOfType(events: AgentStreamEvent[], type: string): any[] {
  return events.filter((e) => e.type === type);
}

describe("runAgentChain citator retry", () => {
  let store: InMemoryStore;
  const INPUT: ChainInput = {
    document_id: "doc-retry-1",
    intake_text: "Draft an NDA between two Indian companies",
    target_language: "en",
    session_id: "session-1",
  };

  beforeEach(() => {
    store = new InMemoryStore();
    vi.clearAllMocks();
  });

  it("does not call reviseDraft when the first citator pass succeeds", async () => {
    const { reviseDraft } = await import("./drafter/index.js");
    const { runCitator } = await import("./citator/index.js");

    const events = await collectEvents(runAgentChain(INPUT, { memoryStore: store }));

    expect(reviseDraft).not.toHaveBeenCalled();
    expect(runCitator).toHaveBeenCalledTimes(1);
    expect(eventsOfType(events, "step.error").length).toBe(0);
    expect(eventsOfType(events, "draft.final").length).toBe(1);
  });

  it("retries once with the rejected node ID, then completes with the revised draft", async () => {
    const { reviseDraft } = await import("./drafter/index.js");
    const { runCitator } = await import("./citator/index.js");
    const { runReviewer } = await import("./reviewer/index.js");

    (runCitator as any).mockResolvedValueOnce(REJECTED).mockResolvedValueOnce(PASSED);
    (reviseDraft as any).mockResolvedValueOnce({
      draft: REVISED_DRAFT,
      trace: { ...MOCK_TRACE, agent: "drafter" },
    });

    const events = await collectEvents(runAgentChain(INPUT, { memoryStore: store }));

    // Drafter was asked to fix exactly the rejected ID
    expect(reviseDraft).toHaveBeenCalledTimes(1);
    const hint = (reviseDraft as any).mock.calls[0][1] as string;
    expect(hint).toContain("ICA-1872/CH-II/S-999");

    // Citator re-validated the REVISED draft
    expect(runCitator).toHaveBeenCalledTimes(2);
    expect((runCitator as any).mock.calls[1][0].draft).toBe(REVISED_DRAFT);

    // Reviewer and final output use the revised draft
    expect((runReviewer as any).mock.calls[0][0].draft.content).toBe(REVISED_DRAFT.content);
    expect(eventsOfType(events, "step.error").length).toBe(0);
    const finals = eventsOfType(events, "draft.final");
    expect(finals.length).toBe(1);
    expect(finals[0].response.body_markdown).toBe(REVISED_DRAFT.content);
  });

  it("fails with a citator step.error when the retry is also rejected", async () => {
    const { reviseDraft } = await import("./drafter/index.js");
    const { runCitator } = await import("./citator/index.js");
    const { runReviewer } = await import("./reviewer/index.js");

    (runCitator as any).mockResolvedValueOnce(REJECTED).mockResolvedValueOnce(REJECTED);
    (reviseDraft as any).mockResolvedValueOnce({
      draft: REVISED_DRAFT,
      trace: { ...MOCK_TRACE, agent: "drafter" },
    });

    const events = await collectEvents(runAgentChain(INPUT, { memoryStore: store }));

    expect(reviseDraft).toHaveBeenCalledTimes(1); // exactly one retry, no loop
    expect(runCitator).toHaveBeenCalledTimes(2);
    expect(runReviewer).not.toHaveBeenCalled();

    const errors = eventsOfType(events, "step.error");
    expect(errors.length).toBe(1);
    expect(errors[0].agent).toBe("citator");
    expect(eventsOfType(events, "draft.final").length).toBe(0);
  });
});