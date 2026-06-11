import { router } from "@trionic/agents";
import type { Fixture } from "../types";
import type { EvalMetric } from "@trionic/shared";

export interface CompletenessResult {
  metric: "completeness";
  required_sections: string[];
  missing_sections: string[];
  completeness_score: number;
  eval_metric: EvalMetric;
  status: "pass" | "fail";
}

export async function completeness(fixture: Fixture): Promise<CompletenessResult> {
  const { doc_type, ground_truth, draft_output } = fixture;
  const draftText = draft_output.text;
  const requiredSections = ground_truth.required_sections;

  // 1. Regex heuristics for fast fallback
  const foundByRegex = new Set<string>();
  const loweredDraft = draftText.toLowerCase();
  
  for (const section of requiredSections) {
    if (section === "pio_address" && (loweredDraft.includes("public information officer") || loweredDraft.includes("pio"))) {
      foundByRegex.add(section);
    } else if (section === "applicant_details" && (loweredDraft.includes("applicant") || loweredDraft.includes("name:"))) {
      foundByRegex.add(section);
    } else if (section === "information_requested" && (loweredDraft.includes("information requested") || loweredDraft.includes("subject:"))) {
      foundByRegex.add(section);
    } else if (section === "payment_details_declaration" && (loweredDraft.includes("fee") || loweredDraft.includes("ipo") || loweredDraft.includes("postal order"))) {
      foundByRegex.add(section);
    }
    // Expand for other templates if needed
  }

  // If all are found via regex, we are 100% complete and can skip LLM
  if (foundByRegex.size === requiredSections.length && requiredSections.length > 0) {
    return {
      metric: "completeness",
      required_sections: requiredSections,
      missing_sections: [],
      completeness_score: 100,
      eval_metric: { name: "completeness_score", value: 100, unit: "percent" },
      status: "pass",
    };
  }

  // 2. LLM Judge Fallback
  const systemPrompt = `You are an expert Legal Auditor verifying the structural completeness of a legal document.
You are given a drafted legal document and a list of required section keys. Your job is to verify whether the semantic content of each required section is present in the draft, even if the section header is named slightly differently.`;

  const userPrompt = `INPUT:
1. Document Type: ${doc_type}
2. Required Sections:
<required_sections>
${JSON.stringify(requiredSections)}
</required_sections>
3. Draft Text:
<draft_text>
${draftText}
</draft_text>

TASK:
For each required section key:
1. Inspect the draft text to see if the content matching that requirement is present.
2. Determine if it is:
   - "PRESENT": The content is clearly written in the document.
   - "MISSING": The content is omitted or severely incomplete.
3. Provide the specific text snippet proving presence, or explain why it is missing.
4. Output your analysis in this strict JSON format:

{
  "sections_evaluation": [
    {
      "section_key": "required_section_key",
      "status": "PRESENT" | "MISSING",
      "matching_snippet": "Snippet of text from the draft showing this content, or null",
      "explanation": "Reasoning for the status"
    }
  ],
  "summary": {
    "total_required": 0,
    "total_present": 0,
    "completeness_score_percent": 0.0
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

  const summary = parsed.summary || { total_required: requiredSections.length, total_present: 0, completeness_score_percent: 0 };
  const evals = parsed.sections_evaluation || [];
  
  const missing_sections = evals
    .filter((s: any) => s.status === "MISSING")
    .map((s: any) => s.section_key);

  return {
    metric: "completeness",
    required_sections: requiredSections,
    missing_sections,
    completeness_score: summary.completeness_score_percent,
    eval_metric: {
      name: "completeness_score",
      value: summary.completeness_score_percent,
      unit: "percent",
    },
    status: summary.completeness_score_percent === 100 ? "pass" : "fail",
  };
}
