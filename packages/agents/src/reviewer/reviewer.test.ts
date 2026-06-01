/**
 * reviewer/reviewer.test.ts
 * Owner: Evan Gregor
 * Module: packages/agents/src/reviewer
 *
 * Unit tests for the Reviewer agent:
 *   - checkBanner()       — deterministic banner matching
 *   - checkCompleteness() — per-doc-type section verification
 *   - runReviewer()       — full agent flow with mocked Router + Tracing
 *   - ReviewerAgent       — class wrapper delegation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DocumentDraft } from "@trionic/shared";

// ─── Mocks (hoisted by vitest before any imports) ─────────────────────────────

// Mock router to avoid network calls
vi.mock("../router/index.js", () => ({
  router: {
    run: vi.fn(),
  },
}));

// Mock tracing to capture traces without real persistence
vi.mock("../tracing/index.js", () => ({
  buildTrace: vi.fn((input) => ({
    agent: input.agent,
    model: input.llmResponse?.model ?? "unknown",
    tokens_in: input.llmResponse?.tokens_in ?? 0,
    tokens_out: input.llmResponse?.tokens_out ?? 0,
    cost_usd: input.llmResponse?.cost_usd ?? 0,
    latency_ms: input.llmResponse?.latency_ms ?? 0,
    cited_nodes: input.cited_nodes ?? [],
    status: input.status,
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
    error_message: input.error_message,
  })),
  buildErrorTrace: vi.fn((agent, error) => ({
    agent,
    model: "unknown",
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    latency_ms: 0,
    cited_nodes: [],
    status: "error",
    error_message: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  })),
  persistTrace: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks are hoisted
import { checkBanner, checkCompleteness, runReviewer, ReviewerAgent } from "./index.js";

const { router } = await import("../router/index.js");

// ─── Test fixtures ────────────────────────────────────────────────────────────

const BANNER =
  `---\n**AI-generated draft — not legal advice.** This document was produced by ` +
  `Trionic Adalat to assist with drafting only. It is not a substitute for advice ` +
  `from a qualified legal professional. Verify all citations and facts before use.\n---`;

const COMPLETE_RTI_BODY = `# Application under the Right to Information Act, 2005

## Address

To,
The Public Information Officer
Municipal Corporation Office
Ahmedabad, Gujarat

## Subject

Request for information regarding municipal budget allocation for ward 42.

## Information Sought

1. Total budget allocated to ward 42 for financial year 2025-2026.
2. Details of infrastructure projects approved under this budget. [CITE:RTI-2005/S-6]

## Declaration

I, the undersigned, declare that I am a citizen of India and the information sought
does not fall within the restrictions set out in Section 8 of the RTI Act, 2005. [CITE:RTI-2005/S-8]`;

const COMPLETE_RTI_DRAFT = BANNER + "\n\n" + COMPLETE_RTI_BODY;

const INCOMPLETE_RTI_DRAFT =
  BANNER +
  "\n\n" +
  `# RTI Application

## Address

To, The Public Information Officer

## Subject

Request for information regarding ward records.`;

const NO_BANNER_RTI_DRAFT = COMPLETE_RTI_BODY;

/** Helper to create a DocumentDraft fixture. */
function makeDraft(
  content: string,
  docType: DocumentDraft["document_type"] = "rti_application"
): DocumentDraft {
  return {
    id: "test-draft-id",
    document_type: docType,
    language: "en",
    content,
    citations: [],
    traces: [],
    created_at: new Date().toISOString(),
  };
}

/** Mock LLM response: tone is clean. */
const MOCK_LLM_PASS = {
  text: JSON.stringify({ tone_issues: [] }),
  model: "gemini-1.5-pro",
  tokens_in: 100,
  tokens_out: 20,
  cost_usd: 0.001,
  latency_ms: 500,
};

/** Mock LLM response: tone issues detected. */
const MOCK_LLM_TONE_FAIL = {
  text: JSON.stringify({
    tone_issues: [
      "Informal greeting: 'Hey' is not appropriate for a legal document",
      "Guarantee: 'You will definitely win this case' is a prohibited guarantee of outcome",
    ],
  }),
  model: "gemini-1.5-pro",
  tokens_in: 100,
  tokens_out: 40,
  cost_usd: 0.002,
  latency_ms: 600,
};

/** Mock LLM response: invalid JSON (simulates Gemini stub output). */
const MOCK_LLM_INVALID_JSON = {
  text: `[GEMINI STUB] Mock response for prompt: "Analyze the tone..."`,
  model: "gemini-1.5-pro",
  tokens_in: 0,
  tokens_out: 0,
  cost_usd: 0,
  latency_ms: 50,
};

// ─── Reset mocks between tests ───────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── checkBanner() ────────────────────────────────────────────────────────────

describe("checkBanner()", () => {
  it("returns true when banner is present at the start", () => {
    expect(checkBanner(COMPLETE_RTI_DRAFT)).toBe(true);
  });

  it("returns false when banner is missing", () => {
    expect(checkBanner(NO_BANNER_RTI_DRAFT)).toBe(false);
  });

  it("returns true with regular hyphen instead of em-dash", () => {
    const draft = "**AI-generated draft - not legal advice.** Some text here...";
    expect(checkBanner(draft)).toBe(true);
  });

  it("returns true with en-dash instead of em-dash", () => {
    const draft = "**AI-generated draft \u2013 not legal advice.** Some text here...";
    expect(checkBanner(draft)).toBe(true);
  });

  it("returns false when banner is past the 2000 char limit", () => {
    const padding = "x".repeat(2000);
    const draft = padding + "\n" + BANNER;
    expect(checkBanner(draft)).toBe(false);
  });

  it("handles case-insensitive matching", () => {
    const draft = "**ai-generated draft — not legal advice.** Some text...";
    expect(checkBanner(draft)).toBe(true);
  });

  it("handles extra whitespace between words", () => {
    const draft = "**AI-generated   draft  —  not  legal  advice.** Some text...";
    expect(checkBanner(draft)).toBe(true);
  });
});

// ─── checkCompleteness() ──────────────────────────────────────────────────────

describe("checkCompleteness()", () => {
  it("returns empty array for a complete RTI draft", () => {
    expect(checkCompleteness(COMPLETE_RTI_BODY, "rti_application")).toEqual([]);
  });

  it("returns missing sections for an incomplete RTI draft", () => {
    const missing = checkCompleteness(INCOMPLETE_RTI_DRAFT, "rti_application");
    expect(missing).toContain("Information Sought");
    expect(missing).toContain("Declaration");
    expect(missing).not.toContain("Address");
    expect(missing).not.toContain("Subject");
  });

  it("returns empty array for non-RTI doc types (no required sections in W2)", () => {
    expect(checkCompleteness("Any content", "legal_notice")).toEqual([]);
    expect(checkCompleteness("Any content", "nda")).toEqual([]);
    expect(checkCompleteness("Any content", "consumer_complaint")).toEqual([]);
    expect(checkCompleteness("Any content", "cheque_bounce_notice")).toEqual([]);
  });

  it("matches section names case-insensitively", () => {
    const draft = "## address\n\n## SUBJECT\n\n## information sought\n\n## DECLARATION";
    expect(checkCompleteness(draft, "rti_application")).toEqual([]);
  });
});

// ─── runReviewer() ────────────────────────────────────────────────────────────

describe("runReviewer()", () => {
  it("returns approved=true for a complete RTI draft with clean tone", async () => {
    (router.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_LLM_PASS);

    const result = await runReviewer({
      draft: makeDraft(COMPLETE_RTI_DRAFT),
      session_id: "test-session",
    });

    expect(result.approved).toBe(true);
    expect(result.banner_present).toBe(true);
    expect(result.missing_required_sections).toEqual([]);
    expect(result.tone_issues).toEqual([]);
    expect(result.trace.status).toBe("ok");
    expect(result.trace.agent).toBe("reviewer");
  });

  it("returns approved=false when banner is missing", async () => {
    (router.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_LLM_PASS);

    const result = await runReviewer({
      draft: makeDraft(NO_BANNER_RTI_DRAFT),
    });

    expect(result.approved).toBe(false);
    expect(result.banner_present).toBe(false);
    expect(result.trace.status).toBe("rejected");
    expect(result.trace.error_message).toBe("Missing disclaimer banner");
  });

  it("returns approved=false with missing sections for incomplete RTI", async () => {
    (router.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_LLM_PASS);

    const result = await runReviewer({
      draft: makeDraft(INCOMPLETE_RTI_DRAFT),
    });

    expect(result.approved).toBe(false);
    expect(result.missing_required_sections.length).toBeGreaterThan(0);
    expect(result.missing_required_sections).toContain("Information Sought");
    expect(result.missing_required_sections).toContain("Declaration");
    expect(result.trace.status).toBe("rejected");
    expect(result.trace.error_message).toBe("Missing required sections: Information Sought, Declaration");
  });

  it("returns approved=false when LLM detects tone issues", async () => {
    (router.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_LLM_TONE_FAIL);

    const result = await runReviewer({
      draft: makeDraft(COMPLETE_RTI_DRAFT),
    });

    expect(result.approved).toBe(false);
    expect(result.tone_issues.length).toBe(2);
    expect(result.tone_issues[0]).toContain("Informal");
    expect(result.trace.status).toBe("rejected");
    expect(result.trace.error_message).toContain("Tone issues flagged");
  });

  it("gracefully handles non-JSON LLM response (Gemini stub)", async () => {
    (router.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_LLM_INVALID_JSON);

    const result = await runReviewer({
      draft: makeDraft(COMPLETE_RTI_DRAFT),
    });

    // Non-JSON → no tone issues detected → falls back to pass on tone
    expect(result.tone_issues).toEqual([]);
    // Banner + completeness pass, tone falls back to pass → approved
    expect(result.approved).toBe(true);
  });

  it("throws and emits error trace when LLM call fails entirely", async () => {
    (router.run as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    await expect(
      runReviewer({ draft: makeDraft(COMPLETE_RTI_DRAFT) })
    ).rejects.toThrow("Network error");
  });

  it("calls router.run with the 'reviewer' step key", async () => {
    (router.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_LLM_PASS);

    await runReviewer({ draft: makeDraft(COMPLETE_RTI_DRAFT) });

    expect(router.run).toHaveBeenCalledWith(
      "reviewer",
      expect.any(String),
      expect.any(String)
    );
  });
});

// ─── ReviewerAgent class ──────────────────────────────────────────────────────

describe("ReviewerAgent", () => {
  it("has name 'reviewer'", () => {
    const agent = new ReviewerAgent();
    expect(agent.name).toBe("reviewer");
  });

  it("delegates run() to runReviewer()", async () => {
    (router.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_LLM_PASS);

    const agent = new ReviewerAgent();
    const result = await agent.run({
      draft: makeDraft(COMPLETE_RTI_DRAFT),
    });

    expect(result.approved).toBe(true);
    expect(result.trace.agent).toBe("reviewer");
  });
});
