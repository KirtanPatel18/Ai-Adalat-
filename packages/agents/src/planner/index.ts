/**
 * planner/index.ts
 * Owner: Malay Sheta (Planner agent — Team C Lead)
 *
 * The Planner agent decides:
 *   - Which document type to draft
 *   - Which PageIndex queries to run
 *   - Which acts apply
 *   - Which template to use
 *
 * Input:  User's intake text + ClassifierOutput
 * Output: PlannerOutput + AgentTrace (for audit trail)
 */

import type { AgentTrace, ClassifierOutput, PlannerOutput, SupportedLanguage } from "@trionic/shared";
import { router } from "../router/index.js";
import { buildTrace, buildErrorTrace, persistTrace } from "../tracing/index.js";
import { PLANNER_SYSTEM_PROMPT, buildPlannerUserPrompt } from "./planner.prompt.js";

// ─── Input / Output shapes ────────────────────────────────────────────────────

export interface PlannerInput {
  /** Raw intake text from the user (any supported language). */
  intakeText: string;
  /** Output from the Classifier agent. */
  classifierOutput: ClassifierOutput;
  /** The language the user requested for the output document. */
  language: SupportedLanguage;
  /** Optional session ID for trace RLS scoping. */
  session_id?: string;
}

export interface PlannerResult {
  /** The structured plan for the Drafter agent. */
  plan: PlannerOutput;
  /** The audit trace for this agent call — persisted to agent_traces table. */
  trace: AgentTrace;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

/**
 * Run the Planner agent.
 *
 * Calls Claude (via LLM Router) with the classified intake and returns
 * a structured PlannerOutput + an AgentTrace matching packages/shared/AgentTrace.
 *
 * @throws Never — errors are captured in the trace with status "error".
 */
export async function runPlanner(input: PlannerInput): Promise<PlannerResult> {
  const { intakeText, classifierOutput, language, session_id } = input;

  try {
    const userPrompt = buildPlannerUserPrompt(intakeText, classifierOutput, language);

    // Route through LLM Router — Claude in Week 1
    const llmResponse = await router.run("planner", PLANNER_SYSTEM_PROMPT, userPrompt);

    // Parse JSON output from the LLM
    // Strip markdown code fences if the LLM returned them despite instructions
    let plan: PlannerOutput;
    try {
      let cleanedText = llmResponse.text.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
      }
      plan = JSON.parse(cleanedText) as PlannerOutput;
    } catch {
      throw new Error(
        `Planner LLM returned invalid JSON: ${llmResponse.text.slice(0, 200)}`
      );
    }

    // Build and persist trace
    const trace = buildTrace({
      agent: "planner",
      llmResponse,
      cited_nodes: [],   // Planner does not emit citations
      status: "ok",
      session_id,
    });
    await persistTrace(trace);

    return { plan, trace };
  } catch (error) {
    const trace = buildErrorTrace("planner", error, session_id);
    await persistTrace(trace);

    // Re-throw with trace attached so the pipeline can surface it
    const err = error instanceof Error ? error : new Error(String(error));
    (err as any).trace = trace;
    throw err;
  }
}

/**
 * PlannerAgent class wrapper (for Agno framework integration).
 * Agno expects agents to be classes with a run() method.
 * Week 1: thin wrapper around runPlanner().
 */
export class PlannerAgent {
  readonly name = "planner";

  async run(input: PlannerInput): Promise<PlannerResult> {
    return runPlanner(input);
  }
}
