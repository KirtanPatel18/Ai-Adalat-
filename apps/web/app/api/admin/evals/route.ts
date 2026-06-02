import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { AgentTrace, EvalMetric, EvalRunResult } from "@trionic/shared";

type AdminUser = {
  id?: string;
  user_metadata?: { role?: string | null } | null;
  app_metadata?: { role?: string | null } | null;
} | null;

type TraceRow = Pick<
  AgentTrace,
  "model" | "tokens_in" | "tokens_out" | "cost_usd" | "latency_ms" | "timestamp"
>;

type TraceQueryResult = {
  data: TraceRow[] | null;
  error: { message?: string } | null;
};

type EvalRunInsertRow = {
  id: string;
};

type EvalRunInsertQueryResult = {
  data: EvalRunInsertRow | null;
  error: { message?: string } | null;
};

interface AdminSupabaseClient {
  auth: {
    getUser: () => Promise<{
      data: { user: AdminUser };
      error: { message?: string } | null;
    }>;
  };
  from(table: "agent_traces"): {
    select: (columns: string) => {
      gte: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<TraceQueryResult>;
      };
    };
  };
  from(table: "eval_runs"): {
    insert: (
      values: Record<string, unknown>,
    ) => {
      select: (columns: string) => {
        single: () => Promise<EvalRunInsertQueryResult>;
      };
    };
  };
}

type EvalBucket = {
  date: string;
  model: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencies: number[];
};

const WINDOW_DAYS = 14;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

function isAdminUser(user: AdminUser | undefined): boolean {
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
  return role === "admin";
}

function percentile(values: number[], quantile: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const position = (sortedValues.length - 1) * quantile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const interpolation = position - lowerIndex;
  return (
    sortedValues[lowerIndex] +
    (sortedValues[upperIndex] - sortedValues[lowerIndex]) * interpolation
  );
}

function getMetricValue(
  run: EvalRunResult,
  metricName: EvalRunResult["metrics"][number]["name"],
): number {
  return run.metrics.find((metric) => metric.name === metricName)?.value ?? 0;
}

function buildEvalRuns(
  rows: TraceRow[],
  now = new Date(),
): EvalRunResult[] {
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const buckets = new Map<string, EvalBucket>();

  for (const row of rows) {
    if (!row.model || !row.timestamp) {
      continue;
    }

    const timestamp = new Date(row.timestamp);
    if (Number.isNaN(timestamp.getTime()) || timestamp < windowStart) {
      continue;
    }

    const date = timestamp.toISOString().slice(0, 10);
    const bucketKey = `${date}::${row.model}`;
    const bucket = buckets.get(bucketKey) ?? {
      date,
      model: row.model,
      calls: 0,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      latencies: [],
    };

    bucket.calls += 1;
    bucket.tokensIn += Number(row.tokens_in ?? 0);
    bucket.tokensOut += Number(row.tokens_out ?? 0);
    bucket.costUsd += Number(row.cost_usd ?? 0);
    bucket.latencies.push(Number(row.latency_ms ?? 0));
    buckets.set(bucketKey, bucket);
  }

  return [...buckets.values()]
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) || left.model.localeCompare(right.model),
    )
    .map((bucket) => {
      const metrics: EvalMetric[] = [
        { name: "total_calls", value: bucket.calls, unit: "calls" },
        { name: "total_tokens_in", value: bucket.tokensIn, unit: "tokens" },
        { name: "total_tokens_out", value: bucket.tokensOut, unit: "tokens" },
        { name: "total_cost_usd", value: bucket.costUsd, unit: "usd" },
        {
          name: "p50_latency_ms",
          value: percentile(bucket.latencies, 0.5),
          unit: "ms",
        },
        {
          name: "p95_latency_ms",
          value: percentile(bucket.latencies, 0.95),
          unit: "ms",
        },
      ];

      return {
        run_id: `run-${bucket.date}-${bucket.model}`,
        dataset_id: "prod-traces",
        model: bucket.model,
        ran_at: new Date(`${bucket.date}T00:00:00.000Z`).toISOString(),
        metrics,
      } satisfies EvalRunResult;
    });
}

function errorResponse(
  status: 400 | 401 | 403 | 500,
  error: string,
  message: string,
  details: string | null = null,
) {
  return NextResponse.json({ error, message, details }, { status });
}

async function createSupabaseClient(): Promise<AdminSupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  // Dynamically import the auth helpers to avoid type errors if the
  // installed package doesn't export the expected named helper types.
  // At runtime the helper should exist; cast to any to satisfy TS.
  // Fallback: if the helper isn't present, construct a minimal client
  // using the Supabase JS client (not implemented here).
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const mod: any = await import("@supabase/auth-helpers-nextjs").catch(() => null);

  if (mod && typeof mod.createRouteHandlerClient === "function") {
    return mod.createRouteHandlerClient({ headers, cookies }) as unknown as AdminSupabaseClient;
  }

  // If the helper is unavailable, throw an error so the caller knows.
  throw new Error("Supabase auth helper 'createRouteHandlerClient' not available");
}

function unauthorizedResponse() {
  return errorResponse(401, "unauthorized", "No active Supabase session", null);
}

function forbiddenResponse() {
  return errorResponse(403, "forbidden", "Admin role required", null);
}

function internalErrorResponse() {
  return errorResponse(500, "internal_error", "Failed to load eval dashboard", null);
}

function warnIfBudgetExceeded(runs: EvalRunResult[]): void {
  const budgetUsd = Number(process.env.EVAL_DAILY_BUDGET_USD ?? "0");
  const alertThreshold = Number(process.env.EVAL_DAILY_BUDGET_ALERT_THRESHOLD ?? "1");

  if (
    !Number.isFinite(budgetUsd) ||
    budgetUsd <= 0 ||
    !Number.isFinite(alertThreshold) ||
    alertThreshold <= 0
  ) {
    return;
  }

  const thresholdUsd = budgetUsd * alertThreshold;

  for (const run of runs) {
    const totalCostUsd = getMetricValue(run, "total_cost_usd");
    if (totalCostUsd >= thresholdUsd) {
      console.warn(
        `[admin/evals] ${run.model} on ${run.ran_at.slice(0, 10)} crossed budget: $${totalCostUsd.toFixed(4)} >= $${thresholdUsd.toFixed(4)}`,
      );
    }
  }
}

async function handleAdminEvals(
  supabase: AdminSupabaseClient,
  now = new Date(),
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedResponse();
  }

  if (!isAdminUser(user)) {
    return forbiddenResponse();
  }

  const cutoff = new Date(now.getTime() - WINDOW_MS);
  const { data, error } = await supabase
    .from("agent_traces")
    .select("*")
    .gte("timestamp", cutoff.toISOString())
    .order("timestamp", { ascending: true });

  if (error) {
    return internalErrorResponse();
  }

  const runs = buildEvalRuns(data ?? [], now);
  warnIfBudgetExceeded(runs);

  return NextResponse.json({ runs });
}

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
