/**
 * tracing/index.ts
 * Owner: Umrania Yug (Tracing / observability layer)
 *
 * Public API for the tracing module.
 * Persists AgentTrace records to Supabase `agent_traces` table.
 */

import type { AgentTrace } from "@trionic/shared";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
  { auth: { autoRefreshToken: false, persistSession: false } }
);
import { redactPII } from "./tracer.js";

export { Tracer } from "./tracer.js";
export { buildTrace, buildErrorTrace, redactPII } from "./tracer.js";
export type { TraceInput, TraceHandle, EndOptions } from "./tracer.js";

/**
 * Persist a trace to Supabase agent_traces table.
 * Uses supabaseAdmin (service role) — bypasses RLS.
 * PII is redacted before any Sentry error logging.
 * Full content is saved to DB as-is.
 */
export async function persistTrace(
  trace: AgentTrace,
  context?: {
    user_id?: string;
    document_id?: string;
  }
): Promise<void> {
  try {

    // Map AgentTrace fields → agent_traces DB columns
    const { error } = await supabaseAdmin
      .from("agent_traces")
      .insert({
        user_id:           context?.user_id ?? trace.session_id ?? "system",
        document_id:       context?.document_id ?? null,
        agent_name:        trace.agent as "planner" | "classifier" | "drafter" | "citator" | "reviewer" | "translator",
        llm_provider:      trace.model.split("-")[0],   // e.g. "claude", "gpt", "gemini"
        model_name:        trace.model,
        prompt_tokens:     trace.tokens_in,
        completion_tokens: trace.tokens_out,
        cost_usd:          trace.cost_usd,
        latency_ms:        trace.latency_ms,
        status:            trace.status === "ok" ? "ok" : trace.status === "error" ? "error" : "ok",
        error_msg:         trace.error_message ?? null,
        metadata: {
          cited_nodes: trace.cited_nodes,
          session_id:  trace.session_id,
          timestamp:   trace.timestamp,
        },
      });

    if (error) throw error;

    console.log(
      `[Trace] agent=${trace.agent}` +
      ` model=${trace.model}` +
      ` tokens=${trace.tokens_in}+${trace.tokens_out}` +
      ` cost=$${trace.cost_usd.toFixed(6)}` +
      ` latency=${trace.latency_ms}ms` +
      ` status=${trace.status}`
    );

  } catch (err) {
    // Redact PII before Sentry
    const safeMessage = redactPII(
      err instanceof Error ? err.message : String(err)
    );
    console.error("[Trace] Failed to persist trace:", safeMessage);
    // TODO: Sentry.captureException(new Error(safeMessage))
  }
}