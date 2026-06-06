/**
 * tracing/index.ts
 * Owner: Umrania Yug (Tracing / observability layer)
 *
 * Public API for the tracing module.
 * Persists AgentTrace records to Supabase `agent_traces` table.
 */

import type { AgentTrace } from "@trionic/shared";
import { createClient } from "@supabase/supabase-js";

let supabaseAdminInstance: any = null;
function getSupabaseAdmin() {
  if (supabaseAdminInstance) return supabaseAdminInstance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabaseAdminInstance = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return supabaseAdminInstance;
}
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
    const insertData: any = {
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
    };

    if (context?.user_id) {
      insertData.user_id = context.user_id;
    }
    if (context?.document_id) {
      insertData.document_id = context.document_id;
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.warn("[Trace] Supabase credentials not configured — trace log skipped");
      console.log(
        `[Trace] agent=${trace.agent}` +
        ` model=${trace.model}` +
        ` tokens=${trace.tokens_in}+${trace.tokens_out}` +
        ` cost=$${trace.cost_usd.toFixed(6)}` +
        ` latency=${trace.latency_ms}ms` +
        ` status=${trace.status}`
      );
      return;
    }

    const { error } = await supabaseAdmin
      .from("agent_traces")
      .insert(insertData);

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