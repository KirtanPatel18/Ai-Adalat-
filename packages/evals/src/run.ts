import { readFileSync } from "fs";
import { randomUUID } from "crypto";
<<<<<<< HEAD
import { citationValidity } from "./metrics/citationValidity.js";
import { hallucinationRate } from "./metrics/hallucinationRate.js";
import { completeness } from "./metrics/completeness.js";
=======
import { citationValidity } from "./metrics/citationValidity";
import { hallucinationRate } from "./metrics/hallucinationRate";
import { completeness } from "./metrics/completeness";
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f
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
<<<<<<< HEAD
    let totalCompletenessScore = 0;
    let totalHallucinationRate = 0;
=======
    let totalClaims = 0;
    let uncitedClaims = 0;
    let totalRequired = 0;
    let totalMissing = 0;
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

    for (const fixture of fixtures) {
      console.log(`  Fixture: ${fixture.fixture_id}`);

<<<<<<< HEAD
      const result = await citationValidity(fixture);
      const hallResult = await hallucinationRate(fixture);
      const compResult = await completeness(fixture);

      totalCitations += result.total_citations;
      validCitations += result.valid_citations;
      totalCompletenessScore += compResult.completeness_score;
      totalHallucinationRate += hallResult.hallucination_rate;
=======
      const citeResult = await citationValidity(fixture);
      const hallucResult = await hallucinationRate(fixture);
      const compResult = await completeness(fixture);

      totalCitations += citeResult.total_citations;
      validCitations += citeResult.valid_citations;
      totalClaims += hallucResult.total_claims;
      uncitedClaims += hallucResult.uncited_claims;
      totalRequired += compResult.required_sections.length;
      totalMissing += compResult.missing_sections.length;
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

      console.log(
        `  Citations:     ${citeResult.valid_citations}/${citeResult.total_citations} valid`,
      );
<<<<<<< HEAD
      console.log(`  Citation Status:    ${result.status.toUpperCase()}`);
      if (result.invalid_citations.length > 0) {
        console.log(`  Invalid Citations:   ${result.invalid_citations.join(", ")}`);
      }
      
      console.log(`  Hallucination Rate: ${hallResult.hallucination_rate.toFixed(1)}%`);
      console.log(`  Hallucination Status: ${hallResult.status.toUpperCase()}`);
      if (hallResult.hallucinated_spans.length > 0) {
        console.log(`  Hallucinated Spans:   ${hallResult.hallucinated_spans.join(" | ")}`);
      }

      console.log(`  Completeness Score: ${compResult.completeness_score.toFixed(1)}%`);
      console.log(`  Completeness Status:  ${compResult.status.toUpperCase()}`);
      if (compResult.missing_sections.length > 0) {
        console.log(`  Missing Sections:   ${compResult.missing_sections.join(", ")}`);
=======
      if (citeResult.invalid_citations.length > 0) {
        console.log(`    Invalid:     ${citeResult.invalid_citations.join(", ")}`);
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f
      }

      console.log(
        `  Hallucination: ${hallucResult.hallucination_rate.toFixed(1)}% (${hallucResult.uncited_claims}/${hallucResult.total_claims} uncited claims)`,
      );
      if (hallucResult.hallucinated_spans.length > 0) {
        console.log(`    Uncited:     "${hallucResult.hallucinated_spans.join('", "')}"`);
      }

      console.log(
        `  Completeness:  ${compResult.completeness_rate.toFixed(1)}% (${compResult.required_sections.length - compResult.missing_sections.length}/${compResult.required_sections.length} present)`,
      );
      if (compResult.missing_sections.length > 0) {
        console.log(`    Missing:     ${compResult.missing_sections.join(", ")}`);
      }

      const casePassed =
        citeResult.status === "pass" &&
        hallucResult.status === "pass" &&
        compResult.status === "pass";
      console.log(`  Status:        ${casePassed ? "PASS" : "FAIL"}`);
      console.log("");
    }

    const overallCiteRate =
      totalCitations === 0 ? 0 : (validCitations / totalCitations) * 100;
<<<<<<< HEAD
    const avgCompleteness = totalCompletenessScore / fixtures.length;
    const avgHallucination = totalHallucinationRate / fixtures.length;
=======
    const overallHallucinationRate =
      totalClaims === 0 ? 0 : (uncitedClaims / totalClaims) * 100;
    const overallCompletenessRate =
      totalRequired === 0 ? 100 : ((totalRequired - totalMissing) / totalRequired) * 100;
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

    // Build EvalRunResult as per @trionic/shared contract
    const evalRunResult: EvalRunResult = {
      run_id: randomUUID(),
      dataset_id: datasetId,
      model,
      ran_at: new Date().toISOString(),
      metrics: [
        {
          name: "citation_validity_rate",
          value: overallCiteRate,
          unit: "percent",
        },
        {
          name: "hallucination_rate",
          value: overallHallucinationRate,
          unit: "percent",
        },
        {
          name: "completeness_rate",
          value: overallCompletenessRate,
          unit: "percent",
        },
        {
          name: "hallucination_rate",
          value: avgHallucination,
          unit: "percent",
        },
        {
          name: "completeness_score",
          value: avgCompleteness,
          unit: "percent",
        }
      ],
    };

    console.log("--- EvalRunResult ---");
    console.log(JSON.stringify(evalRunResult, null, 2));

    // Write to eval_runs table via POST /api/admin/evals/run (Om's API)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
      const res = await fetch(`${baseUrl}/api/admin/evals/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_id: datasetId,
          models: [model],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { run_id: string };
        console.log(`\n[eval_runs] Queued run_id: ${data.run_id}`);
      } else {
        console.log(
          `\n[eval_runs] API returned ${res.status} — skipping write`,
        );
      }
    } catch {
      console.log(
        "\n[eval_runs] API not reachable — skipping write (run locally without server)",
      );
    }

<<<<<<< HEAD
    const passed = overallRate === 100 && avgHallucination === 0 && avgCompleteness === 100;
    console.log("\n==============================================");
    console.log(
      passed
        ? " EVAL PASSED ✓"
        : ` EVAL FAILED ✗ (Citations: ${overallRate.toFixed(1)}%, Hallucinations: ${avgHallucination.toFixed(1)}%, Completeness: ${avgCompleteness.toFixed(1)}%)`,
=======
    const overallPassed =
      overallCiteRate === 100 &&
      overallHallucinationRate === 0 &&
      overallCompletenessRate === 100;

    console.log("\n==============================================");
    console.log(
      overallPassed
        ? " EVAL PASSED ✓"
        : ` EVAL FAILED ✗ (Citations: ${overallCiteRate.toFixed(1)}%, Hallucination: ${overallHallucinationRate.toFixed(1)}%, Completeness: ${overallCompletenessRate.toFixed(1)}%)`,
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f
    );
    console.log("==============================================");
  }
}

runEvals().catch(console.error);

