/**
 * reviewer/index.ts
 * Owner: Evan Gregor
 * Module: packages/agents/src/reviewer
 *
 * TODO: Implement the Reviewer agent.
 * Stub exports are provided so the package compiles while this is in progress.
 */

import type { AgentTrace, DocumentDraft } from "@trionic/shared";

// ─── Input / Output shapes ────────────────────────────────────────────────────

export interface ReviewerInput {
  /** The citator-validated draft to review. */
  draft: DocumentDraft;
  /** Optional session ID for trace attribution. */
  session_id?: string;
}

export interface ReviewerResult {
  /** Whether the draft passed review. */
  approved: boolean;
  /** Reviewer's feedback / reasoning. */
  feedback: string;
  /** Reason for rejection if approved === false. */
  rejection_reason?: string;
  /** Audit trace for this agent call. */
  trace: AgentTrace;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

/** TODO: Evan Gregor — implement full reviewer logic. */
export async function runReviewer(_input: ReviewerInput): Promise<ReviewerResult> {
  throw new Error("ReviewerAgent not yet implemented — owner: Evan Gregor");
}

export class ReviewerAgent {
  readonly name = "reviewer";

  async run(input: ReviewerInput): Promise<ReviewerResult> {
    return runReviewer(input);
  }
}
