/**
 * citator/index.ts
 * Owner: Hitarth Sherathia
 * Module: packages/agents/src/citator
 *
 * TODO: Implement the Citator-Gatekeeper agent.
 * Stub exports are provided so the package compiles while this is in progress.
 */

import type { AgentTrace, Citation, DocumentDraft } from "@trionic/shared";

// ─── Input / Output shapes ────────────────────────────────────────────────────

export interface CitatorInput {
  /** The draft to validate citations for. */
  draft: DocumentDraft;
  /** Optional session ID for trace attribution. */
  session_id?: string;
}

export interface CitatorResult {
  /** Whether all citations passed validation. */
  passed: boolean;
  /** Validated citations. Empty if rejected. */
  validatedCitations: Citation[];
  /** Reason for rejection if passed === false. */
  rejection_reason?: string;
  /** Audit trace for this agent call. */
  trace: AgentTrace;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

import { router } from "../router/index.js";
import { buildTrace, buildErrorTrace, persistTrace } from "../tracing/index.js";
import { CITATOR_SYSTEM_PROMPT, buildCitatorUserPrompt } from "./citator.prompt.js";
import { validateCitationsSanity } from "./validator.js";

/** TODO: Hitarth Sherathia — implement full citator-gatekeeper logic. */
export async function runCitator(input: CitatorInput): Promise<CitatorResult> {
  const { draft, session_id } = input;

  try {
    const userPrompt = buildCitatorUserPrompt(draft);

    const llmResponse = await router.run("citator", CITATOR_SYSTEM_PROMPT, userPrompt);

    // Parse JSON output from the LLM
    let parsed: any;
    try {
      parsed = JSON.parse(llmResponse.text);
    } catch (err) {
      const trace = buildErrorTrace("citator", new Error(`Citator LLM returned invalid JSON: ${llmResponse.text.slice(0, 200)}`), session_id);
      await persistTrace(trace);
      const e = err instanceof Error ? err : new Error(String(err));
      (e as any).trace = trace;
      throw e;
    }

    // Basic shape expectations
    const passed = Boolean(parsed.passed);
    const rawCitations = parsed.validatedCitations ?? [];
    const rejection_reason = typeof parsed.rejection_reason === "string" ? parsed.rejection_reason : undefined;

    // Run local sanity checks
    const validation = validateCitationsSanity(rawCitations, draft);

    let finalPassed = passed && validation.valid;
    let finalRejection = rejection_reason;
    if (!validation.valid) {
      finalPassed = false;
      finalRejection = finalRejection ?? validation.reason ?? "Local validation failed";
    }

    const traceStatus: AgentTrace["status"] = finalPassed ? "ok" : "rejected";

    const trace = buildTrace({
      agent: "citator",
      llmResponse,
      cited_nodes: (validation.valid ? validation.validatedCitations : []).map((c) => c.node_id),
      status: traceStatus,
      session_id,
    });

    await persistTrace(trace);

    return {
      passed: finalPassed,
      validatedCitations: validation.valid ? validation.validatedCitations : [],
      rejection_reason: finalPassed ? undefined : finalRejection,
      trace,
    };
  } catch (error) {
    const trace = buildErrorTrace("citator", error, input.session_id);
    await persistTrace(trace);

    const err = error instanceof Error ? error : new Error(String(error));
    (err as any).trace = trace;
    throw err;
  }
}

export class CitatorGatekeeperAgent {
  readonly name = "citator";

  async run(input: CitatorInput): Promise<CitatorResult> {
    return runCitator(input);
  }
}
