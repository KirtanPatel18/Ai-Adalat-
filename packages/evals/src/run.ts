import { readFileSync } from "fs";
import { citationValidity } from "./metrics/citationValidity";
import type { Fixture } from "./types";

function runEval(fixturePath: string): void {
  console.log("==============================================");
  console.log(" Trionic Adalat — Eval Harness");
  console.log("==============================================\n");

  // Load fixture
  const raw = readFileSync(fixturePath, "utf-8");
  const fixture: Fixture = JSON.parse(raw);

  console.log(`Fixture:   ${fixture.fixture_id}`);
  console.log(`Doc type:  ${fixture.doc_type}`);
  console.log(`Language:  ${fixture.language}`);
  console.log(
    `Agents:    ${fixture.agent_traces.map((t) => t.agent).join(", ")}`,
  );
  console.log("");

  // Run citation validity metric
  const result = citationValidity(fixture);

  console.log("--- Metric: Citation Validity ---");
  console.log(`Total citations:   ${result.total_citations}`);
  console.log(`Valid citations:   ${result.valid_citations}`);
  console.log(
    `Invalid citations: ${result.invalid_citations.length === 0 ? "none" : result.invalid_citations.join(", ")}`,
  );
  console.log(`Score:             ${result.score_percent}%`);
  console.log(`Status:            ${result.status.toUpperCase()}`);
  console.log("");

  // Per-LLM cost and latency summary
  console.log("--- Per-Agent Cost & Latency ---");
  for (const trace of fixture.agent_traces) {
    console.log(
      `${trace.agent.padEnd(25)} model: ${trace.model.padEnd(30)} latency: ${trace.latency_ms}ms   cost: $${trace.cost_usd}`,
    );
  }

  console.log("\n==============================================");
  console.log(result.status === "pass" ? " EVAL PASSED ✓" : " EVAL FAILED ✗");
  console.log("==============================================");
}

// Entry point
runEval("fixtures/rti-english-001.json");
