import type { EvalMetric } from "@trionic/shared";
import type { Fixture } from "../types";

export type CompletenessResult = {
  metric: "completeness";
  required_sections: string[];
  missing_sections: string[];
  completeness_rate: number;
  eval_metric: EvalMetric;
  status: "pass" | "fail";
};

// Keyword mapping for common required sections
const SECTION_KEYWORDS: Record<string, string[]> = {
  address: ["pio", "public information officer", "to,", "officer", "address"],
  pio_address: ["pio", "public information officer", "to,", "officer", "address"],
  subject: ["subject", "sub:", "regarding", "re:"],
  sections_sought: ["sought", "information requested", "particulars of information", "information sought", "request"],
  information_requested: ["sought", "information requested", "particulars of information", "information sought", "request"],
  declaration: ["declare", "citizen of india", "fee", "ipo", "postal order", "payment"],
  payment_details_declaration: ["declare", "citizen of india", "fee", "ipo", "postal order", "payment"],
  applicant_details: ["applicant", "details of applicant", "name of applicant", "kaushal vora", "john doe"],
  appeal_grounds: ["appeal", "grounds", "reason for appeal", "aggrieved", "rejection"]
};

/**
 * Checks if a specific section key is present in the draft text.
 */
function isSectionPresent(sectionKey: string, text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // 1. Direct match for header or label (e.g. "### Subject" or "**Subject**" or "Subject:")
  const cleanKey = sectionKey.replace(/_/g, " ").trim().toLowerCase();
  const directHeaderRegex = new RegExp(`(#+|\\*\\*|__)\\s*${cleanKey}\\s*(#+|\\*\\*|__)?`, "i");
  const directLabelRegex = new RegExp(`^\\s*${cleanKey}\\s*:`, "mi");

  if (directHeaderRegex.test(text) || directLabelRegex.test(text)) {
    return true;
  }

  // 2. Keyword/phrase fallback
  const keywords = SECTION_KEYWORDS[sectionKey] || [cleanKey];
  return keywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Evaluates the structural completeness of a draft document in a fixture.
 * Completeness Rate = (present_sections / required_sections) * 100
 */
export async function completeness(
  fixture: Fixture,
): Promise<CompletenessResult> {
  const text = fixture.draft_output.text;
  const requiredSections = fixture.ground_truth.required_sections || [];
  
  const missingSections: string[] = [];

  for (const section of requiredSections) {
    if (!isSectionPresent(section, text)) {
      missingSections.push(section);
    }
  }

  const totalRequired = requiredSections.length;
  const presentRequired = totalRequired - missingSections.length;
  const rate = totalRequired === 0 ? 100 : (presentRequired / totalRequired) * 100;

  return {
    metric: "completeness",
    required_sections: requiredSections,
    missing_sections: missingSections,
    completeness_rate: rate,
    eval_metric: {
      name: "completeness_rate",
      value: rate,
      unit: "percent"
    },
    status: rate === 100 ? "pass" : "fail"
  };
}
