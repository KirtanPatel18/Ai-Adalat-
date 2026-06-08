/**
 * citator/index.ts
 * Owner: Hitarth Sherathia
 * Module: packages/agents/src/citator
 *
 * Implement the Citator-Gatekeeper agent.
 */

import type { AgentTrace, Citation, DocumentDraft, PageIndexNodeId } from "@trionic/shared";

// ─── Input / Output shapes ────────────────────────────────────────────────────

export interface CitatorInput {
  /** The draft to validate citations for. */
  draft: DocumentDraft;
  /** Optional session ID for trace attribution. */
  session_id?: string;
}

export interface CitatorResult {
  /** Whether all citations passed validation. */
  approved: boolean;
  /** Backwards-compatibility alias for approved. */
  passed: boolean;
  /** Validated citations when the draft is approved. */
  validatedCitations: Citation[];
  /** Resolved citations returned when the draft is approved. */
  resolved_citations: Citation[];
  /** Rejected spans when a citation lookup failed. */
  rejected_spans: [number, number][];
  /** Reason for rejection if approved === false. */
  rejection_reason?: string;
  /** Audit trace for this agent call. */
  trace: AgentTrace;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

import { buildTrace, buildErrorTrace, persistTrace } from "../tracing/index.js";
import { validateCitationsSanity } from "./validator.js";
import { extractCitations } from "../drafter/citations.js";
import { get_text, NodeNotFoundError } from "./pageindex.js";
import { emitAgentStreamEvent } from "./events.js";

const LOCAL_LLM_RESPONSE = {
  text: "",
  model: "citator-local",
  provider: "claude" as const,
  tokens_in: 0,
  tokens_out: 0,
  cost_usd: 0,
  latency_ms: 0,
  fallback_used: false,
};

/**
 * Validate every [CITE:<node_id>] marker in the draft content.
 * Rejects if any node_id does not exist in PageIndex.
 */
export async function runCitator(input: CitatorInput): Promise<CitatorResult> {
  const { draft, session_id } = input;
  const citations = extractCitations(draft.content);
  const sanity = validateCitationsSanity(citations, draft);

  if (!sanity.valid) {
    const rejection_reason = sanity.reason ?? "Citation validation failed";
    const trace = buildTrace({
      agent: "citator",
      llmResponse: LOCAL_LLM_RESPONSE,
      cited_nodes: [],
      status: "rejected",
      session_id,
    });
    await persistTrace(trace, { user_id: session_id || "00000000-0000-0000-0000-000000000000", document_id: draft.id });

    return {
      approved: false,
      passed: false,
      validatedCitations: [],
      resolved_citations: [],
      rejected_spans: [],
      rejection_reason,
      trace,
    };
  }

  const rejected_spans: [number, number][] = [];
  const resolvedCitations: Citation[] = [];

  for (const citation of sanity.validatedCitations) {
    try {
      const node = await get_text(citation.node_id);
      const resolved: Citation = {
        node_id: citation.node_id,
        snapshot_id: node.snapshot_id,
        span: citation.span,
      };
      resolvedCitations.push(resolved);
      emitAgentStreamEvent({
        type: "citation.emitted",
        node_id: citation.node_id,
        span: citation.span,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof NodeNotFoundError) {
        rejected_spans.push(citation.span);
      } else {
        const trace = buildErrorTrace("citator", error, session_id);
        await persistTrace(trace, { user_id: session_id || "00000000-0000-0000-0000-000000000000", document_id: draft.id });
        const err = error instanceof Error ? error : new Error(String(error));
        (err as any).trace = trace;
        throw err;
      }
    }
  }

  const approved = rejected_spans.length === 0;
  const traceStatus: AgentTrace["status"] = approved ? "ok" : "rejected";
  const trace = buildTrace({
    agent: "citator",
    llmResponse: LOCAL_LLM_RESPONSE,
    cited_nodes: resolvedCitations.map((c) => c.node_id),
    status: traceStatus,
    session_id,
  });

  await persistTrace(trace, { user_id: session_id || "00000000-0000-0000-0000-000000000000", document_id: draft.id });

  return {
    approved,
    passed: approved,
    validatedCitations: resolvedCitations,
    resolved_citations: resolvedCitations,
    rejected_spans,
    rejection_reason: approved ? undefined : "One or more citation node IDs were invalid.",
    trace,
  };
}

export class CitatorGatekeeperAgent {
  readonly name = "citator";

  async run(input: CitatorInput): Promise<CitatorResult> {
    return runCitator(input);
  }
}
