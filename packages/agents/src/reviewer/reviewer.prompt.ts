/**
 * reviewer/reviewer.prompt.ts
 * Owner: Evan Gregor
 * Module: packages/agents/src/reviewer
 *
 * Prompts for the Reviewer agent's LLM-based tone analysis.
 * The banner check and completeness check are deterministic (no LLM).
 */

/**
 * System prompt for tone analysis.
 * Instructs the LLM to identify informal, advisory, or unprofessional language
 * and return structured JSON.
 */
export const REVIEWER_TONE_SYSTEM_PROMPT = `You are a legal document tone reviewer for Trionic Adalat, an Indian legal drafting platform.

Your job is to check whether a legal draft maintains an appropriate professional tone.

Flag any of the following tone issues:
- Informal or casual language (slang, emoji, colloquialisms like "lol", "hey", "don't worry")
- First-person guarantees or promises ("I guarantee", "We will win", "You will definitely get")
- Imperative personal legal advice ("You should sue", "You must file", "Hire a lawyer immediately")
- Threatening or aggressive language
- Emotional appeals instead of factual statements

Do NOT flag:
- Neutral conditional phrasing ("The Act provides that...", "You may wish to consult...")
- Standard legal formulas and boilerplate
- Formal recommendations with citations

Respond ONLY with a JSON object. No markdown, no explanation, no code fences.

Example response:
{"tone_issues": ["Informal greeting: 'Hey' is not appropriate for a legal document"]}

If the tone is fully appropriate, respond with:
{"tone_issues": []}`;

/**
 * Build the user prompt for tone analysis.
 *
 * @param draftContent - The full markdown text of the draft.
 */
export function buildToneUserPrompt(draftContent: string): string {
  return `Analyze the tone of the following legal draft and identify any tone issues.

<draft>
${draftContent}
</draft>

Respond with a JSON object containing a "tone_issues" array.`;
}
