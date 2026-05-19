import type { Fixture } from "../types";

export type CitationValidityResult = {
  metric: "citation_validity";
  total_citations: number;
  valid_citations: number;
  invalid_citations: string[];
  score_percent: number;
  status: "pass" | "fail";
};

export function citationValidity(fixture: Fixture): CitationValidityResult {
  const citeMarkers = fixture.draft_output.cite_markers;
  const validNodeIds = new Set(fixture.ground_truth.valid_node_ids);

  const invalidCitations = citeMarkers
    .map((marker) => marker.node_id)
    .filter((id) => !validNodeIds.has(id));

  const totalCitations = citeMarkers.length;
  const validCitations = totalCitations - invalidCitations.length;
  const scorePercent =
    totalCitations === 0 ? 0 : (validCitations / totalCitations) * 100;

  return {
    metric: "citation_validity",
    total_citations: totalCitations,
    valid_citations: validCitations,
    invalid_citations: invalidCitations,
    score_percent: scorePercent,
    status: scorePercent === 100 ? "pass" : "fail",
  };
}
