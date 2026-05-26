import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { citationValidity } from "./metrics/citationValidity";
import type { EvalRunResult } from "@trionic/shared";
import type { Fixture } from "./types";

// Parse CLI args
// Usage: tsx src/run.ts --fixture fixtures/rti.json --models claude-sonnet-4-20250514,gpt-4o
const args = process.argv.slice(2);
const fixtureArgIdx = args.indexOf("--fixture");
const modelsArgIdx = args.indexOf("--models");

const fixturePath =
  fixtureArgIdx !== -1
    ? args[fixtureArgIdx + 1]
    : "fixtures/rti-english-001.json";
const models =
  modelsArgIdx !== -1
    ? args[modelsArgIdx + 1].split(",")
    : ["claude-sonnet-4-20250514"];

async function runEvals(): Promise<void> {
  console.log("==============================================");
  console.log(" Trionic Adalat — Eval Harness");
  console.log("==============================================\n");

  // Load fixture file
  const raw = readFileSync(fixturePath, "utf-8");
  const parsed = JSON.parse(raw);

  // Support both single fixture and multi-fixture format
  const fixtures: Fixture[] = parsed.fixtures ?? [parsed];
  const datasetId: string = parsed.dataset_id ?? parsed.fixture_id ?? "unknown";

  console.log(`Dataset:   ${datasetId}`);
  console.log(`Fixture:   ${fixturePath}`);
  console.log(`Models:    ${models.join(", ")}`);
  console.log(`Cases:     ${fixtures.length}`);
  console.log("");

  for (const model of models) {
    console.log(`\n--- Running model: ${model} ---\n`);

    let totalCitations = 0;
    let validCitations = 0;

    for (const fixture of fixtures) {
      console.log(`  Fixture: ${fixture.fixture_id}`);

      const result = await citationValidity(fixture);

      totalCitations += result.total_citations;
      validCitations += result.valid_citations;

      console.log(
        `  Citations: ${result.valid_citations}/${result.total_citations} valid`,
      );
      console.log(`  Status:    ${result.status.toUpperCase()}`);
      if (result.invalid_citations.length > 0) {
        console.log(`  Invalid:   ${result.invalid_citations.join(", ")}`);
      }
      console.log("");
    }

    const overallRate =
      totalCitations === 0 ? 0 : (validCitations / totalCitations) * 100;

    // Build EvalRunResult as per @trionic/shared contract
    const evalRunResult: EvalRunResult = {
      run_id: randomUUID(),
      dataset_id: datasetId,
      model,
      ran_at: new Date().toISOString(),
      metrics: [
        {
          name: "citation_validity_rate",
          value: overallRate,
          unit: "percent",
        },
      ],
    };

    console.log("--- EvalRunResult ---");
    console.log(JSON.stringify(evalRunResult, null, 2));

    // TODO: write to eval_runs table via POST /api/admin/evals/run
    // once Om's Supabase table is ready
    console.log("\n[TODO] Write to eval_runs table when Om's schema is ready");

    console.log("\n==============================================");
    console.log(
      overallRate === 100
        ? " EVAL PASSED ✓"
        : ` EVAL FAILED ✗ (${overallRate.toFixed(1)}%)`,
    );
    console.log("==============================================");
  }
}

runEvals().catch(console.error);
