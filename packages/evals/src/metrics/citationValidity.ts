import type { EvalMetric, SnapshotId } from "@trionic/shared";
import { get_text } from "@trionic/pageindex";
import type { Fixture } from "../types";

interface GetTextResult {
  text: string;
  snapshot_id: SnapshotId;
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
    try {
      const result = await get_text(marker.node_id);
      if (!result) {
        invalidCitations.push(marker.node_id);
      }
    } catch {
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
