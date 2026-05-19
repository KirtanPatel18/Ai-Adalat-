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

/** TODO: Hitarth Sherathia — implement full citator-gatekeeper logic. */
export async function runCitator(_input: CitatorInput): Promise<CitatorResult> {
  throw new Error("CitatorGatekeeperAgent not yet implemented — owner: Hitarth Sherathia");
}

export class CitatorGatekeeperAgent {
  readonly name = "citator";

  async run(input: CitatorInput): Promise<CitatorResult> {
    return runCitator(input);
  }
}
