/**
 * src/index.ts — Master public API for @trionic/agents
 * Owner: Malay Sheta (Team C Lead — scaffolder)
 *
 * This is the ONLY file Team B (API layer) imports from.
 * All agents and the router are exported from here.
 *
 * Acceptance criteria (Week 1):
 *   ✅ exports a runnable PlannerAgent stub
 *   ✅ Router resolves model from config; pluggable interface
 *   ✅ Trace shape matches packages/shared/AgentTrace type
 *
 * Week-2 additions:
 *   ✅ PlannerAgent skeleton (agents/planner.ts) — canned plan by domain
 *   ✅ runAgentChain — full pipeline orchestrator (orchestrator.ts)
 */

// ─── LLM Router ───────────────────────────────────────────────────────────────
export { LLMRouter, router } from "./router/index.js";
export type { LLMRequest, LLMResponse } from "./router/index.js";

// ─── Tracing ──────────────────────────────────────────────────────────────────
export { buildTrace, buildErrorTrace, persistTrace } from "./tracing/index.js";
export type { TraceInput } from "./tracing/index.js";

// ─── Planner Agent ✅ (Malay Sheta) ──────────────────────────────────────────
export { PlannerAgent, runPlanner } from "./planner/index.js";
export type { PlannerInput, PlannerResult } from "./planner/index.js";

// ─── Classifier Agent (Kathan Purohit) ───────────────────────────────────────
export { ClassifierAgent, runClassifier } from "./classifier/index.js";
export type { ClassifierInput, ClassifierResult } from "./classifier/index.js";

// ─── Drafter Agent (Jenil Sutariya) ──────────────────────────────────────────
export { DrafterAgent, runDrafter } from "./drafter/index.js";
export type { DrafterInput, DrafterResult } from "./drafter/index.js";

// ─── Citator-Gatekeeper Agent ⚠️ (Hitarth Sherathia) ────────────────────────
export { CitatorGatekeeperAgent, runCitator } from "./citator/index.js";
export type { CitatorInput, CitatorResult } from "./citator/index.js";

// ─── Reviewer Agent (Evan Gregor) ────────────────────────────────────────────
export { ReviewerAgent, runReviewer } from "./reviewer/index.js";
export type { ReviewerInput, ReviewerResult } from "./reviewer/index.js";

// ─── Translator Agent (Maharshi Patel) ───────────────────────────────────────
export { TranslatorAgent, runTranslator } from "./translator/index.js";
export type { TranslatorInput, TranslatorResult } from "./translator/index.js";

// ─── Types ────────────────────────────────────────────────────────────────────
export type { PipelineInput, PipelineResult } from "./types.js";

// ─── Week-2: PlannerAgent skeleton (agents/planner.ts) ───────────────────────
// Named differently from the W1 PlannerAgent to avoid a conflict.
// The W2 class is the canonical one going forward.
export {
  PlannerAgent as PlannerAgentV2,
  runPlannerAgent,
} from "./agents/planner.js";
export type {
  PlannerInput as PlannerInputV2,
  PlannerResult as PlannerResultV2,
} from "./agents/planner.js";

// ─── Week-2: DrafterAgent (agents/drafter.ts) ────────────────────────────────
export {
  DrafterAgent as DrafterAgentV2,
  runDrafterAgent,
} from "./agents/drafter.js";
export type {
  DrafterAgentInput,
  PageIndexNodeInput,
} from "./agents/drafter.js";

// ─── Week-2: runAgentChain orchestrator ──────────────────────────────────────
export { runAgentChain } from "./orchestrator.js";
