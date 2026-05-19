/**
 * tracing/tracer.ts
 * Owner: Umrania Yug (Tracing / observability layer)
 *
 * Core tracing logic. Builds an AgentTrace object from a completed LLM response.
 * Does NOT do I/O — pure transformation. The index.ts handles Supabase persistence.
 */

import type { AgentTrace, PageIndexNodeId } from "@trionic/shared";
import type { LLMResponse } from "../router/index.js";

export interface TraceInput {
  /** Name of the agent that ran. */
  agent: string;
  /** LLM response returned by the router. */
  llmResponse: LLMResponse;
  /** PageIndex node IDs cited in this output (empty [] for planner/classifier). */
  cited_nodes: PageIndexNodeId[];
  /** Terminal status for this step. */
  status: AgentTrace["status"];
  /** Optional session/user ID for RLS scoping. */
  session_id?: string;
  /** Error message if status is "error" or "rejected". */
  error_message?: string;
}

/**
 * Build a fully-typed AgentTrace from a completed LLM response.
 * All agents should call this after every LLM call before returning.
 */
export function buildTrace(input: TraceInput): AgentTrace {
  return {
    agent: input.agent,
    model: input.llmResponse.model,
    tokens_in: input.llmResponse.tokens_in,
    tokens_out: input.llmResponse.tokens_out,
    cost_usd: input.llmResponse.cost_usd,
    latency_ms: input.llmResponse.latency_ms,
    cited_nodes: input.cited_nodes,
    status: input.status,
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
    error_message: input.error_message,
  };
}

/**
 * Build an error trace when an agent fails before even reaching the LLM.
 */
export function buildErrorTrace(
  agent: string,
  error: unknown,
  session_id?: string
): AgentTrace {
  const message = error instanceof Error ? error.message : String(error);
  return {
    agent,
    model: "unknown",
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    latency_ms: 0,
    cited_nodes: [],
    status: "error",
    timestamp: new Date().toISOString(),
    session_id,
    error_message: message,
  };
}
