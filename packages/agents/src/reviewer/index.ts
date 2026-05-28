/**
 * reviewer/index.ts
 * Owner: Evan Gregor
 * Module: packages/agents/src/reviewer
 *
 * The Reviewer agent is the last automated editorial step in the English
 * drafting pipeline. It runs AFTER the Citator-gatekeeper has approved
 * all citations. It performs three checks:
 *
 *   1. Banner check   — deterministic: is the "not legal advice" disclaimer present?
 *   2. Completeness   — deterministic: are all required sections for the doc type present?
 *   3. Tone check     — LLM-based: is the language formal, professional, non-advisory?
 *
 * Returns ReviewerOutput (from @trionic/shared) + AgentTrace.
 *
 * See: docs/RFC-reviewer-agent.md, Issue #112
 */

import type { AgentTrace, DocumentDraft, DocumentType, ReviewerOutput } from "@trionic/shared";
import { router } from "../router/index.js";
import { buildTrace, buildErrorTrace, persistTrace } from "../tracing/index.js";
import { REVIEWER_TONE_SYSTEM_PROMPT, buildToneUserPrompt } from "./reviewer.prompt.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * The canonical "not legal advice" disclaimer banner.
 * Must appear in the first 2,000 characters of every draft.
 */
export const LEGAL_DISCLAIMER_BANNER =
  `---\n**AI-generated draft — not legal advice.** This document was produced by ` +
  `Trionic Adalat to assist with drafting only. It is not a substitute for advice ` +
  `from a qualified legal professional. Verify all citations and facts before use.\n---`;

/**
 * Regex to match the bold lead-in of the banner.
 * Handles em-dash (—), en-dash (–), and hyphen (-); whitespace-insensitive; case-insensitive.
 */
const BANNER_LEAD = /ai[-–—\s]*generated\s+draft\s*[-–—]+\s*not\s+legal\s+advice/i;

/**
 * Per-doc-type required sections.
 * Week 2: only RTI is populated; all others are empty (always pass).
 */
export const REQUIRED_SECTIONS: Record<DocumentType, string[]> = {
  rti_application: ["Address", "Subject", "Information Sought", "Declaration"],
  legal_notice: [],
  nda: [],
  consumer_complaint: [],
  cheque_bounce_notice: [],
};

// ─── Input / Output shapes ────────────────────────────────────────────────────

export interface ReviewerInput {
  /** The citator-validated draft to review. */
  draft: DocumentDraft;
  /** Optional session ID for trace attribution. */
  session_id?: string;
}

/**
 * Extends the locked ReviewerOutput from @trionic/shared with the audit trace.
 * Fields: approved, banner_present, missing_required_sections, tone_issues, trace.
 */
export interface ReviewerResult extends ReviewerOutput {
  /** Audit trace for this agent call. */
  trace: AgentTrace;
}

// ─── Pure check functions ─────────────────────────────────────────────────────

/**
 * Deterministic banner check.
 * Returns true if the "not legal advice" lead-in appears in the first 2,000 chars.
 */
export function checkBanner(draftMarkdown: string): boolean {
  const head = draftMarkdown.slice(0, 2000);
  return BANNER_LEAD.test(head);
}

/**
 * Deterministic completeness check.
 * Returns the list of MISSING required section names for the given doc type.
 * Empty array = all sections present (or doc type has no required sections in W2).
 */
export function checkCompleteness(
  draftMarkdown: string,
  docType: DocumentType
): string[] {
  const required = REQUIRED_SECTIONS[docType] ?? [];
  const lower = draftMarkdown.toLowerCase();
  return required.filter((section) => !lower.includes(section.toLowerCase()));
}

// ─── Agent ────────────────────────────────────────────────────────────────────

/**
 * Run the Reviewer agent on a citator-approved draft.
 *
 * Steps:
 *   1. checkBanner()       — deterministic, no LLM
 *   2. checkCompleteness() — deterministic, no LLM
 *   3. Tone analysis       — real LLM call via Router ("reviewer" step)
 *   4. Aggregate → ReviewerResult
 *   5. Build and persist AgentTrace
 *
 * @throws On infrastructure errors (LLM call fails). Business failures
 *         (banner missing, sections missing, tone issues) are returned as
 *         approved: false, trace.status: "rejected".
 */
export async function runReviewer(input: ReviewerInput): Promise<ReviewerResult> {
  const { draft, session_id } = input;

  try {
    // 1. Banner check (deterministic)
    const banner_present = checkBanner(draft.content);

    // 2. Completeness check (deterministic)
    const missing_required_sections = checkCompleteness(
      draft.content,
      draft.document_type
    );

    // 3. Tone check (LLM call via Router)
    const userPrompt = buildToneUserPrompt(draft.content);
    const llmResponse = await router.run(
      "reviewer",
      REVIEWER_TONE_SYSTEM_PROMPT,
      userPrompt
    );

    // Parse tone issues from LLM response — graceful fallback on invalid JSON
    let tone_issues: string[] = [];
    try {
      const parsed = JSON.parse(llmResponse.text);
      if (Array.isArray(parsed.tone_issues)) {
        tone_issues = parsed.tone_issues.filter(
          (issue: unknown): issue is string =>
            typeof issue === "string" && issue.length > 0
        );
      }
    } catch {
      // LLM returned non-JSON (expected with Gemini stub) — no tone issues flagged
    }

    // 4. Aggregate
    const approved =
      banner_present &&
      missing_required_sections.length === 0 &&
      tone_issues.length === 0;

    const traceStatus: AgentTrace["status"] = approved ? "ok" : "rejected";

    let error_message: string | undefined;
    if (!approved) {
      const reasons: string[] = [];
      if (!banner_present) {
        reasons.push("Missing disclaimer banner");
      }
      if (missing_required_sections.length > 0) {
        reasons.push(`Missing required sections: ${missing_required_sections.join(", ")}`);
      }
      if (tone_issues.length > 0) {
        reasons.push(`Tone issues flagged: ${tone_issues.join("; ")}`);
      }
      error_message = reasons.join(" | ");
    }

    // 5. Build and persist trace
    const trace = buildTrace({
      agent: "reviewer",
      llmResponse,
      cited_nodes: [], // Reviewer does not emit citations
      status: traceStatus,
      session_id,
      error_message,
    });
    await persistTrace(trace);

    return {
      approved,
      banner_present,
      missing_required_sections,
      tone_issues,
      trace,
    };
  } catch (error) {
    const trace = buildErrorTrace("reviewer", error, session_id);
    await persistTrace(trace);

    const err = error instanceof Error ? error : new Error(String(error));
    (err as any).trace = trace;
    throw err;
  }
}

export class ReviewerAgent {
  readonly name = "reviewer";

  async run(input: ReviewerInput): Promise<ReviewerResult> {
    return runReviewer(input);
  }
}
