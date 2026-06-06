import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { AgentTrace, EvalMetric, EvalRunResult } from "@trionic/shared";

export type AdminUser = {
  id?: string;
  user_metadata?: { role?: string | null } | null;
  app_metadata?: { role?: string | null } | null;
} | null;

export interface AdminSupabaseClient {
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

export type TraceRow = {
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  cost_usd?: number | null;
  latency_ms?: number | null;
  timestamp?: string | null;
};

export type TraceQueryResult = {
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

export const WINDOW_DAYS = 14;
export const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function isAdminUser(user: AdminUser | undefined): boolean {
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
  return role === "admin";
}

export function errorResponse(
  status: 400 | 401 | 403 | 500,
  error: string,
  message: string,
  details: string | null = null,
) {
  return NextResponse.json({ error, message, details }, { status });
}

export function unauthorizedResponse() {
  return errorResponse(401, "unauthorized", "No active Supabase session", null);
}

export function forbiddenResponse() {
  return errorResponse(403, "forbidden", "Admin role required", null);
}

export async function createSupabaseClient(): Promise<AdminSupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const mod = (await import("@supabase/auth-helpers-nextjs").catch(() => null)) as {
    createRouteHandlerClient?: unknown;
  } | null;

  if (mod && typeof mod.createRouteHandlerClient === "function") {
    const createRouteHandlerClient = mod.createRouteHandlerClient as (args: {
      headers: typeof headers;
      cookies: typeof cookies;
    }) => unknown;
    return createRouteHandlerClient({ headers, cookies }) as AdminSupabaseClient;
  }

  throw new Error("Supabase auth helper 'createRouteHandlerClient' not available");
}

type EvalRunRequestBody = {
  dataset_id: string;
  models: string[];
};

function isEvalRunRequestBody(value: unknown): value is EvalRunRequestBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.dataset_id === "string" &&
    Array.isArray(candidate.models) &&
    candidate.models.length > 0 &&
    candidate.models.every((model) => typeof model === "string" && model.length > 0)
  );
}

function badRequestResponse(message: string) {
  return errorResponse(400, "bad_request", message, null);
}

function internalErrorResponse() {
  return errorResponse(500, "internal_error", "Failed to queue eval run", null);
}

export async function handleAdminEvalRun(
  supabase: AdminSupabaseClient,
  body: unknown,
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

  if (!isEvalRunRequestBody(body)) {
    return badRequestResponse("Invalid eval run payload");
  }

  const insertResult = (await supabase
    .from("eval_runs")
    .insert({
      run_name: `${body.dataset_id}-${now.toISOString()}`,
      eval_type: "per_llm_dashboard",
      config: {
        dataset_id: body.dataset_id,
        models: body.models,
      },
      run_by: user.id ?? null,
      status: "running",
    })
    .select("id")
    .single()) as any;

  if (insertResult.error || !insertResult.data?.id) {
    return internalErrorResponse();
  }

  return NextResponse.json({ run_id: insertResult.data.id }, { status: 202 });
}

export function percentile(values: number[], quantile: number): number {
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

export function getMetricValue(
  run: EvalRunResult,
  metricName: EvalRunResult["metrics"][number]["name"],
): number {
  return run.metrics.find((metric) => metric.name === metricName)?.value ?? 0;
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

export function buildEvalRuns(
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

function dashboardInternalErrorResponse() {
  return errorResponse(500, "internal_error", "Failed to load eval dashboard", null);
}

export function warnIfBudgetExceeded(runs: EvalRunResult[]): void {
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

export async function handleAdminEvals(
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
    return dashboardInternalErrorResponse();
  }

  const runs = buildEvalRuns(data ?? [], now);
  warnIfBudgetExceeded(runs);

  return NextResponse.json({ runs });
}
