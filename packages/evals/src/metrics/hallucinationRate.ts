import { router } from "@trionic/agents";
import type { Fixture } from "../types";
import type { EvalMetric } from "@trionic/shared";

export interface HallucinationResult {
  metric: "hallucination_rate";
  total_claims: number;
  uncited_claims: number;
  hallucinated_spans: string[];
  hallucination_rate: number;
  eval_metric: EvalMetric;
  status: "pass" | "fail";
}

export async function hallucinationRate(
  fixture: Fixture,
): Promise<HallucinationResult> {
  const systemPrompt = `You are an expert Indian Legal Evaluator and Auditor. Your job is to analyze AI-generated legal drafts and identify all "Legal Claims" and verify if they are properly cited.

A "Legal Claim" is defined as any statement that:
1. Asserts a specific legal right, obligation, duty, or prohibition.
2. Identifies a legal penalty, punishment, or consequence.
3. Specifies a time-bound legal deadline or procedural rule.
4. References specific sections, articles, or judgments of law.

"Free Prose" includes:
1. Conversational greetings or endings.
2. Summaries of the user's situation without asserting legal rules.
3. General advice to hire a lawyer.
4. Syntactic transitions.`;

  const userPrompt = `INPUT:
1. Generated Draft Text:
<draft_text>
${fixture.draft_output.text}
</draft_text>

2. Valid Ground-Truth Node IDs:
<valid_nodes>
${JSON.stringify(fixture.ground_truth.valid_node_ids)}
</valid_nodes>

TASK:
1. Segment the Draft Text into individual sentences or logical clauses.
2. Classify each segment as:
   - "FREE_PROSE" (No legal claim made)
   - "CLAIM" (Active legal claim made)
3. For every "CLAIM" segment:
   - Check if a \`[CITE:<node_id>]\` tag is appended or integrated.
   - If a tag is present, check if the \`<node_id>\` matches one of the IDs in the <valid_nodes> list.
   - Mark the claim as:
     - "CITED_AND_VALID": Has a cite tag that exists in <valid_nodes>.
     - "CITED_BUT_INVALID": Has a cite tag, but the ID is missing from <valid_nodes>.
     - "UNCITED" (Hallucination): No cite tag exists for this active legal claim.
4. Output your analysis in the strict JSON format below:

{
  "segments": [
    {
      "text": "The sentence or clause text",
      "type": "CLAIM" | "FREE_PROSE",
      "citation_status": "CITED_AND_VALID" | "CITED_BUT_INVALID" | "UNCITED" | "N/A",
      "cited_node_id": "node_id_or_null",
      "reasoning": "Brief explanation of classification"
    }
  ],
  "summary": {
    "total_claims": 0,
    "uncited_claims": 0,
    "hallucination_rate_percent": 0.0
  }
}`;

  const response = await router.run("classifier", systemPrompt, userPrompt);
  
  let parsed: any;
  try {
    const jsonStr = response.text.match(/\{[\s\S]*\}/)?.[0] || "{}";
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("Failed to parse LLM judge response: " + response.text);
  }

  const summary = parsed.summary || { total_claims: 0, uncited_claims: 0, hallucination_rate_percent: 0 };
  const segments = parsed.segments || [];
  
  const hallucinated_spans = segments
    .filter((s: any) => s.type === "CLAIM" && s.citation_status === "UNCITED")
    .map((s: any) => s.text);

  return {
    metric: "hallucination_rate",
    total_claims: summary.total_claims,
    uncited_claims: summary.uncited_claims,
    hallucinated_spans,
    hallucination_rate: summary.hallucination_rate_percent,
    eval_metric: {
      name: "hallucination_rate",
      value: summary.hallucination_rate_percent,
      unit: "percent",
    },
    status: summary.hallucination_rate_percent === 0 ? "pass" : "fail",
  };
}
