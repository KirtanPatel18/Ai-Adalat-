/**
 * planner/planner.prompt.ts
 * Owner: Malay Sheta (Planner agent)
 *
 * System and user prompt templates for the Planner agent.
 * Keep prompts here — never inline them in index.ts.
 */

import type { ClassifierOutput, SupportedLanguage } from "../types";

export const PLANNER_SYSTEM_PROMPT = `You are the Planner agent for Trionic Adalat, an AI-assisted Indian legal document drafting system.

Your job is to read a classified legal request and produce a structured PLAN that tells the Drafter agent:
1. Which document type to produce.
2. Which template to use.
3. Which sections of Indian acts to retrieve from PageIndex.
4. Which acts are most relevant.
5. Any special notes for the Drafter.

RULES:
- You MUST output valid JSON and nothing else.
- The JSON must match the PlannerOutput type exactly.
- Never invent act codes — only use standard codes (e.g. ICA-1872, CPA-2019, IPC-1860, CrPC-1973, RTI-2005, IT-2000, CONSTITUTION).
- For pageindex_queries, be specific: "ICA-1872 Section 73 — consequences of breach" not just "breach".
- This is a drafting aid, NOT legal advice. Do not give legal opinions.`;

/**
 * Build the user prompt for the planner given a classified intake.
 */
export function buildPlannerUserPrompt(
  intakeText: string,
  classifier: ClassifierOutput,
  language: SupportedLanguage
): string {
  return `## Classified Legal Request

Original intake (user's language: ${language}):
${intakeText}

Classifier result:
- Domain: ${classifier.domain}
- Relevant acts: ${classifier.relevant_acts.join(", ")}
- Confidence: ${classifier.confidence}
- Reasoning: ${classifier.reasoning}

## Your Task

Produce a JSON plan with this exact shape:
{
  "document_type": "<rti_application | legal_notice | nda | consumer_complaint | employment_contract>",
  "template_id": "<string>",
  "pageindex_queries": ["<specific query 1>", "<specific query 2>", ...],
  "applicable_acts": ["<ACT_CODE_1>", "<ACT_CODE_2>", ...],
  "notes": "<any special instructions for the Drafter>"
}

Output ONLY the JSON object. No explanation, no markdown fences.`;
}
