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
