import type { EvalMetric, SnapshotId } from "@trionic/shared";
import type { Fixture } from "../types";

// PageIndex contract from Samarth's agnoTool.ts (pageindex/query-api-week-2)
// TODO: replace this import once his PR is merged into main:
// import { pageindex } from "@trionic/pageindex";
interface GetTextResult {
  text: string;
  snapshot_id: SnapshotId;
}

async function getTextFromPageIndex(
  node_id: string,
): Promise<GetTextResult | null> {
  // TODO: replace with real import once Samarth's PR merges:
  // return await pageindex.get_text({ node_id });

  // Mocking Samarth's exact contract — returns null for invalid nodes
  if (node_id === "RTI-2005/CH-XX/S-99" || node_id.startsWith("RTI-FAKE")) {
    return null;
  }
  return {
    text: `Mock text for node ${node_id}`,
    snapshot_id: "2024-12-01",
  };
}

export type CitationValidityResult = {
  metric: "citation_validity";
  total_citations: number;
  valid_citations: number;
  invalid_citations: string[];
  citation_validity_rate: number;
  eval_metric: EvalMetric;
  status: "pass" | "fail";
};

export async function citationValidity(
  fixture: Fixture,
): Promise<CitationValidityResult> {
  const citeMarkers = fixture.draft_output.cite_markers;
  const invalidCitations: string[] = [];

  for (const marker of citeMarkers) {
    const result = await getTextFromPageIndex(marker.node_id);
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
