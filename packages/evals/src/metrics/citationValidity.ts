import type { EvalMetric } from "@trionic/shared";
import type { Fixture } from "../types";

export type CitationValidityResult = {
  metric: "citation_validity";
  total_citations: number;
  valid_citations: number;
  invalid_citations: string[];
  citation_validity_rate: number;
  eval_metric: EvalMetric;
  status: "pass" | "fail";
};

/**
 * Mock pageindex.get_text — replace with real Samarth's implementation
 * once packages/pageindex/src/agnoTool.ts is merged.
 * Returns text if node exists in ground_truth, null if not.
 */
async function getTextFromPageIndex(
  node_id: string,
  valid_node_ids: string[],
): Promise<{ text: string } | null> {
  // TODO: replace with real call once Samarth merges agnoTool.ts
  // return await pageindex.get_text({ node_id });
  if (valid_node_ids.includes(node_id)) {
    return { text: `Mock text for node ${node_id}` };
  }
  return null;
}

export async function citationValidity(
  fixture: Fixture,
): Promise<CitationValidityResult> {
  const citeMarkers = fixture.draft_output.cite_markers;
  const validNodeIds = fixture.ground_truth.valid_node_ids;

  const invalidCitations: string[] = [];

  for (const marker of citeMarkers) {
    const result = await getTextFromPageIndex(marker.node_id, validNodeIds);
    if (!result) {
      invalidCitations.push(marker.node_id);
    }
  }

  const totalCitations = citeMarkers.length;
  const validCitations = totalCitations - invalidCitations.length;
  const citationValidityRate =
    totalCitations === 0 ? 0 : (validCitations / totalCitations) * 100;

  return {
    metric: "citation_validity",
    total_citations: totalCitations,
    valid_citations: validCitations,
    invalid_citations: invalidCitations,
    citation_validity_rate: citationValidityRate,
    eval_metric: {
      name: "citation_validity_rate",
      value: citationValidityRate,
      unit: "percent",
    },
    status: citationValidityRate === 100 ? "pass" : "fail",
  };
}
