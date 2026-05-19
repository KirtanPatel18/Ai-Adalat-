/**
 * classifier/index.ts
 * Owner: Kathan Purohit
 * Module: packages/agents/src/classifier
 *
 * TODO: Implement the Classifier agent.
 * Stub exports are provided so the package compiles while this is in progress.
 */

import type { AgentTrace, ClassifierOutput, SupportedLanguage } from "@trionic/shared";

// ─── Input / Output shapes ────────────────────────────────────────────────────

export interface ClassifierInput {
  /** Raw intake text from the user. */
  intakeText: string;
  /** Language the user wants the output document in. */
  language: SupportedLanguage;
  /** Optional session ID for trace attribution. */
  session_id?: string;
}

export interface ClassifierResult {
  /** Structured classification output. */
  classification: ClassifierOutput;
  /** Audit trace for this agent call. */
  trace: AgentTrace;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

/** TODO: Kathan Purohit — implement full classifier logic. */
export async function runClassifier(_input: ClassifierInput): Promise<ClassifierResult> {
  throw new Error("ClassifierAgent not yet implemented — owner: Kathan Purohit");
}

export class ClassifierAgent {
  readonly name = "classifier";

  async run(input: ClassifierInput): Promise<ClassifierResult> {
    return runClassifier(input);
  }
}
