/**
 * drafter/index.ts
 * Owner: Jenil Sutariya
 * Module: packages/agents/src/drafter
 *
 * TODO: Implement the Drafter agent.
 * Stub exports are provided so the package compiles while this is in progress.
 */

import type { AgentTrace, DocumentDraft, PlannerOutput } from "@trionic/shared";

// ─── Input / Output shapes ────────────────────────────────────────────────────

export interface DrafterInput {
  /** Plan produced by the Planner agent. */
  plan: PlannerOutput;
  /** Optional session ID for trace attribution. */
  session_id?: string;
}

export interface DrafterResult {
  /** The generated document draft. */
  draft: DocumentDraft;
  /** Audit trace for this agent call. */
  trace: AgentTrace;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

/** TODO: Jenil Sutariya — implement full drafter logic. */
export async function runDrafter(_input: DrafterInput): Promise<DrafterResult> {
  throw new Error("DrafterAgent not yet implemented — owner: Jenil Sutariya");
}

export class DrafterAgent {
  readonly name = "drafter";

  async run(input: DrafterInput): Promise<DrafterResult> {
    return runDrafter(input);
  }
}
