import { NextResponse } from "next/server";
import {
  buildEvalRuns,
  createSupabaseClient,
  errorResponse,
  handleAdminEvals,
  warnIfBudgetExceeded,
  TraceRow,
} from "./lib";

export async function GET() {
  try {
    const supabase = await createSupabaseClient();
    return handleAdminEvals(supabase);
  } catch (error) {
    // If Supabase envs are not configured yet, return local mock fixture data
    // so the admin dashboard can be tested while migrations/infra land.
    if (error instanceof Error && /Supabase environment variables are not configured/.test(error.message)) {
      const runs = buildEvalRuns(MOCK_TRACES);
      warnIfBudgetExceeded(runs);
      return NextResponse.json({ runs });
    }

    return errorResponse(
      500,
      "internal_error",
      error instanceof Error ? error.message : "Unknown error",
      process.env.NODE_ENV === "development" && error instanceof Error ? error.stack ?? null : null,
    );
  }
}

// Inline mock fixture data used when real Supabase / agent_traces table isn't available yet.
// Generates realistic-looking traces across the last 14 days for several LLM models.
const MODELS = ["claude-opus", "claude-sonnet", "gpt-4", "gemini-pro"];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 4) {
  const v = Math.random() * (max - min) + min;
  return Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function generateMockTraces(): TraceRow[] {
  const traces: TraceRow[] = [];
  const now = Date.now();
  const days = 14;

  for (const model of MODELS) {
    // give each model between 120 and 420 calls over the window
    const calls = randomInt(120, 420);
    for (let i = 0; i < calls; i++) {
      // spread timestamps across the last 14 days
      const offsetMs = randomInt(0, days * 24 * 60 * 60 * 1000 - 1);
      const timestamp = new Date(now - offsetMs).toISOString();

      const tokensIn = randomInt(10, 800);
      const tokensOut = randomInt(5, 1200);
      const costPerCall = randomFloat(0.01, 0.10, 5);
      const latency = randomInt(200, 1000);

      traces.push({
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd: costPerCall,
        latency_ms: latency,
        timestamp,
      });
    }
  }

  // Shuffle traces to avoid strictly grouped timestamps
  for (let i = traces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [traces[i], traces[j]] = [traces[j], traces[i]];
  }

  return traces;
}

const MOCK_TRACES: TraceRow[] = generateMockTraces();
