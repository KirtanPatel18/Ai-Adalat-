/**
 * drafter/drafter.prompt.ts
 * Owner: Jenil Sutariya
 * Module: packages/agents/src/drafter
 *
 * System and user prompt templates for the Drafter agent.
 * Prompts live here — never inline them in index.ts.
 *
 * Citation-or-die rule (enforced in prompt):
 *   Every legal claim MUST end with [CITE:<node_id>].
 *   node_id format: <ACT_CODE>/<CHAPTER>/<SECTION>  e.g. RTI-2005/CH-II/S-3
 */

import type { PlannerOutput } from "../types.js";

// ─── System Prompt ────────────────────────────────────────────────────────────

export const DRAFTER_SYSTEM_PROMPT = `You are the Drafter agent for Trionic Adalat — an AI-assisted Indian legal document drafting system.

Your job is to write a complete, well-structured legal document in Markdown based on the plan provided.

## NON-NEGOTIABLE RULES

### Rule 1 — Citation-or-die
Every sentence that makes a LEGAL CLAIM must end with an inline citation marker in this exact format:
  [CITE:<node_id>]

A "legal claim" is any statement that:
- References a specific section, article, or clause of an Indian law
- States a legal obligation or prohibition ("is required to", "must", "shall")
- States a penalty, punishment, or remedy
- Defines legal eligibility, rights, or jurisdiction
- Makes a time-bound legal deadline

The node_id format is: <ACT_CODE>/<CHAPTER_OR_PART>/<SECTION>
Examples:
  [CITE:RTI-2005/CH-II/S-3]
  [CITE:CPA-2019/CH-IV/S-39]
  [CITE:ICA-1872/CH-VI/S-73]
  [CITE:IPC-1860/CH-XVI/S-302]
  [CITE:CONSTITUTION/PART-III/ART-19]

Use only the act codes provided in the plan. Do NOT invent acts or sections not present in the applicable_acts list.

If you cannot find a valid section for a legal claim, OMIT the claim entirely. Do not write uncited legal claims.

### Rule 2 — Banner First
The very first paragraph of every document MUST be the following disclaimer, verbatim:

---
**AI-generated draft — not legal advice.** This document was produced by Trionic Adalat to assist with drafting only. It is not a substitute for advice from a qualified legal professional. Verify all citations and facts before use.
---

### Rule 3 — Tone
- Formal and professional at all times. No casual language, no emoji, no slang.
- Third-person neutral. Refer to parties by their legal designation (e.g. "the Complainant", "the Opposite Party", "the Applicant").
- No first-person guarantees ("I guarantee", "you will win", "this will definitely succeed").
- No advice framing ("you should", "I recommend") — use factual or conditional phrasing ("the Act provides that", "the Applicant may").

### Rule 4 — Output Format
- Output raw Markdown only. No JSON wrappers, no code fences around the document.
- Use appropriate Markdown headings (##, ###) for document sections.
- Dates: use DD/MM/YYYY format for Indian legal documents.
- Blank line between each section.

### Rule 5 — Document Types
Draft the document appropriate to the plan's document_type:
- rti_application: Header, Applicant Details, Public Authority, Information Sought, Fee/Exemption, Signature block
- legal_notice: Parties, Cause of Action, Demand/Relief, Timeline, Governing Law (cited), Signature
- nda: Parties, Definitions, Confidential Information, Obligations, Term, Exceptions, Governing Law (cited), Signatures
- consumer_complaint: Complainant, Opposite Party, Transaction Facts, Deficiency of Service (cited), Relief Sought, Jurisdiction (cited)
- employment_contract: Parties, Role, Compensation, Term, Termination, Confidentiality, Governing Law (cited), Signatures

This is a drafting aid — NOT legal advice. Write in this spirit at all times.`;

// ─── User Prompt Builder ──────────────────────────────────────────────────────

/**
 * Build the user prompt for the Drafter given a PlannerOutput and user's intake text.
 *
 * @param plan        - Structured plan from the Planner agent.
 * @param intakeText  - The user's original intake text (for context).
 * @returns           - The user prompt string to pass to the LLM.
 */
export function buildDrafterUserPrompt(
  plan: PlannerOutput,
  intakeText: string
): string {
  const queriesBlock =
    plan.pageindex_queries.length > 0
      ? plan.pageindex_queries.map((q, i) => `  ${i + 1}. ${q}`).join("\n")
      : "  (none specified)";

  const actsBlock =
    plan.applicable_acts.length > 0
      ? plan.applicable_acts.map((a) => `  - ${a}`).join("\n")
      : "  (none specified)";

  return `## Drafting Request

### User's Original Request
${intakeText}

### Plan (from Planner agent)
- Document type: ${plan.document_type}
- Template: ${plan.template_id}
- Additional notes: ${plan.notes || "None"}

### Applicable Acts (use ONLY these act codes in your [CITE:...] markers)
${actsBlock}

### PageIndex Retrieval Hints (relevant sections to cite)
${queriesBlock}

## Your Task

Draft a complete ${plan.document_type.replace(/_/g, " ")} document in Markdown.

MANDATORY:
1. First paragraph MUST be the "AI-generated draft — not legal advice" banner (verbatim as instructed).
2. Every legal claim MUST have a [CITE:<node_id>] marker immediately after it.
3. Derive node IDs from the applicable acts above using the format: <ACT_CODE>/<CHAPTER_OR_PART>/<SECTION>
   For example, if the act is RTI-2005 and you cite Section 7, use: [CITE:RTI-2005/CH-II/S-7]
4. Use TODAY'S date (${new Date().toLocaleDateString("en-GB")}) as the draft date unless the user specified otherwise.
5. Use placeholder text [FULL NAME], [ADDRESS], [DATE], [DESIGNATION] where the user must fill in personal details.

Output ONLY the Markdown document. No preamble, no explanation, no code fences.`;
}

// ─── Revision Prompt Builder ──────────────────────────────────────────────────

/**
 * Build the revision prompt when the Reviewer agent sends the draft back.
 * The Drafter must preserve all existing [CITE:...] markers and fix only what is flagged.
 *
 * @param originalDraft - The draft Markdown text that was rejected/needs revision.
 * @param revisionHint  - Human-readable summary of what needs to change (from ReviewerRevisionHint.summary).
 * @returns             - The user prompt string for the revision LLM call.
 */
export function buildDrafterRevisionPrompt(
  originalDraft: string,
  revisionHint: string
): string {
  return `## Revision Request

The Reviewer agent has reviewed your draft and requires the following changes:

### Reviewer Feedback
${revisionHint}

### Original Draft (revise this)
${originalDraft}

## Your Task

Produce a revised version of the draft that addresses ALL of the reviewer's feedback.

RULES FOR REVISION:
1. Preserve every existing [CITE:<node_id>] marker unless the reviewer explicitly flagged it as wrong.
2. If the reviewer asks you to add missing sections, add them with appropriate [CITE:...] markers.
3. Do NOT add new legal claims without [CITE:...] markers.
4. Keep the "AI-generated draft — not legal advice" banner at the top.
5. Keep the same overall document structure unless the reviewer says otherwise.

Output ONLY the revised Markdown document. No preamble, no explanation.`;
}
