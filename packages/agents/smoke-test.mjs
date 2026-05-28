/**
 * smoke-test.mjs — Week-2 demo gate
 *
 * Run from the package root:
 *   pnpm --filter @trionic/agents build
 *   node packages/agents/smoke-test.mjs
 *
 * Or from a Node REPL after building:
 *   import { runAgentChain } from "./dist/index.js";
 *   for await (const evt of runAgentChain(req)) { console.log(evt); }
 *
 * Acceptance criteria:
 *   → All 5 stub agents fire in order (classifier, planner, drafter, citator, reviewer)
 *   → Each agent emits step.start + step.done events
 *   → Final event is draft.final with a DraftResponse
 */

// Dynamic import works with both CJS and ESM builds
const { runAgentChain } = await import("./dist/agents/src/index.js");

const canned_req = {
  document_id:     "demo-doc-001",
  intake_text:
    "I bought a faulty refrigerator from XYZ Electronics. It stopped working " +
    "after 10 days. The shop owner is refusing to replace or refund it. " +
    "I want to file a consumer complaint.",
  target_language: "en",
  doc_type:        "consumer_complaint",
};

console.log("\n======= runAgentChain smoke-test =======\n");
console.log("Request:", JSON.stringify(canned_req, null, 2), "\n");

const agentOrder = [];

for await (const evt of runAgentChain(canned_req)) {
  if (evt.type === "step.start") {
    agentOrder.push(evt.agent);
    console.log(`▶  [${evt.type}]  agent=${evt.agent}  ts=${evt.ts}`);
  } else if (evt.type === "step.done") {
    console.log(
      `✅ [${evt.type}]  agent=${evt.agent}  ` +
        `duration_ms=${evt.duration_ms}  tokens=${evt.tokens}`
    );
  } else if (evt.type === "step.error") {
    console.error(`❌ [${evt.type}]  agent=${evt.agent}  message=${evt.message}`);
  } else if (evt.type === "citation.emitted") {
    console.log(`🔗 [${evt.type}]  node_id=${evt.node_id}`);
  } else if (evt.type === "draft.partial") {
    console.log(`📝 [${evt.type}]  chunk_len=${evt.markdown_chunk.length} chars`);
  } else if (evt.type === "draft.final") {
    console.log(`\n🏁 [${evt.type}]`);
    console.log("   document_id:", evt.response.document_id);
    console.log("   version_id: ", evt.response.version_id);
    console.log("   body_len:   ", evt.response.body_markdown.length, "chars");
    console.log("   citations:  ", evt.response.citations.length);
    console.log("   warnings:   ", evt.response.warnings);
    console.log("   trace_ids:  ", evt.response.trace_ids.length, "entries");
  }
}

console.log("\n======= Agent firing order =======");
console.log(agentOrder.join(" → "));

const EXPECTED = ["classifier", "planner", "drafter", "citator", "reviewer"];
const allFired = EXPECTED.every((a) => agentOrder.includes(a));
console.log("\nDemo gate:", allFired ? "✅ PASS — all 5 agents fired" : "❌ FAIL");

process.exit(allFired ? 0 : 1);
