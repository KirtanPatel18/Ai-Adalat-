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

export function isAdminUser(user: AdminUser | undefined): boolean {
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
  return role === "admin";
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

function getMetricValue(
  run: EvalRunResult,
  metricName: EvalRunResult["metrics"][number]["name"],
): number {
  return run.metrics.find((metric) => metric.name === metricName)?.value ?? 0;
}

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
  const budgetUsd = Number(process.env.EVAL_DAILY_BUDGET_USD ?? "5.0");
  const alertThresholdPct = Number(process.env.EVAL_DAILY_BUDGET_ALERT_THRESHOLD ?? "100");

  if (
    !Number.isFinite(budgetUsd) ||
    budgetUsd <= 0 ||
    !Number.isFinite(alertThresholdPct) ||
    alertThresholdPct <= 0
  ) {
    return;
  }

  const thresholdUsd = (budgetUsd * alertThresholdPct) / 100;

  // Group runs by date to check daily totals
  const dailyTotals = new Map<string, { totalCost: number; models: Set<string> }>();

  for (const run of runs) {
    const date = run.ran_at.slice(0, 10);
    const totalCostUsd = getMetricValue(run, "total_cost_usd");

    if (!dailyTotals.has(date)) {
      dailyTotals.set(date, { totalCost: 0, models: new Set() });
    }

    const daily = dailyTotals.get(date)!;
    daily.totalCost += totalCostUsd;
    daily.models.add(run.model);

    // Warn if individual model exceeds threshold
    if (totalCostUsd >= thresholdUsd) {
      console.warn(
        `[admin/evals] Alert: ${run.model} on ${date} exceeded threshold: $${totalCostUsd.toFixed(4)} >= $${thresholdUsd.toFixed(4)} (budget: $${budgetUsd.toFixed(2)})`,
      );
    }
  }

  // Check daily totals against budget
  for (const [date, data] of dailyTotals.entries()) {
    if (data.totalCost > budgetUsd) {
      console.warn(
        `[admin/evals] BUDGET EXCEEDED: Daily cost on ${date} is $${data.totalCost.toFixed(4)}, exceeds limit of $${budgetUsd.toFixed(2)} by $${(data.totalCost - budgetUsd).toFixed(4)}. Models involved: ${Array.from(data.models).join(", ")}`,
      );
    } else if (data.totalCost >= thresholdUsd) {
      console.warn(
        `[admin/evals] Budget Warning: Daily cost on ${date} is $${data.totalCost.toFixed(4)}, at ${((data.totalCost / budgetUsd) * 100).toFixed(1)}% of $${budgetUsd.toFixed(2)} limit.`,
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
  const { data: traces, error: queryError } = await supabase
    .from("agent_traces")
    .select("model,tokens_in,tokens_out,cost_usd,latency_ms,timestamp")
    .gte("timestamp", cutoff.toISOString())
    .order("timestamp", { ascending: false });

  if (queryError) {
    // Surface query errors to the caller
    // Log for server-side visibility
    // eslint-disable-next-line no-console
    console.error("Query error:", queryError);
    return errorResponse(
      500,
      "internal_error",
      queryError.message ?? "Failed to query agent_traces",
      null,
    );
  }

  if (!traces || traces.length === 0) {
    return NextResponse.json({ runs: [] });
  }

  // Budget config: $5 per model per day (Week 3)
  const BUDGET_CAP_USD = 5.0;
  const budgetAlerts: Array<{
    model: string;
    date: string;
    spend: string;
    budget: string;
    severity: string;
    message: string;
  }> = [];

  // Compute per-date-per-model spends so we can attach daily budget info to runs
  const modelSpendsByBucket: { [key: string]: number } = {};
  (traces as TraceRow[]).forEach((trace) => {
    const ts = trace.timestamp ? new Date(trace.timestamp) : null;
    if (!ts || Number.isNaN(ts.getTime()) || !trace.model) return;
    const date = ts.toISOString().slice(0, 10);
    const key = `${date}::${trace.model}`;
    modelSpendsByBucket[key] = (modelSpendsByBucket[key] ?? 0) + Number(trace.cost_usd ?? 0);
  });

  // Produce alerts for any model-date that exceeds the daily cap
  Object.entries(modelSpendsByBucket).forEach(([key, spend]) => {
    const [date, model] = key.split("::");
    if (spend > BUDGET_CAP_USD) {
      const alert = {
        model,
        date,
        spend: spend.toFixed(2),
        budget: BUDGET_CAP_USD.toFixed(2),
        severity: "critical",
        message: `Model ${model} exceeded daily budget: $${spend.toFixed(2)} > $${BUDGET_CAP_USD.toFixed(2)}`,
      };
      budgetAlerts.push(alert);
      // Week 3: log to console; Week 4 will send to Sentry
      // eslint-disable-next-line no-console
      console.warn(`[BUDGET ALERT] ${alert.message}`);
    }
  });

  const aggregatedRuns = buildEvalRuns(traces as TraceRow[], now);
  warnIfBudgetExceeded(aggregatedRuns);

  type BudgetAlert = {
    model: string;
    date: string;
    spend: string;
    budget: string;
    severity: string;
    message: string;
  };

  type RunWithBudget = EvalRunResult & {
    budget_exceeded?: boolean;
    alerts?: BudgetAlert[];
  };

  const runsWithBudget: RunWithBudget[] = aggregatedRuns.map((run) => {
    const date = run.ran_at.slice(0, 10);
    const key = `${date}::${run.model}`;
    const modelSpend = modelSpendsByBucket[key] ?? 0;

    const metrics = [
      ...run.metrics,
      { name: "daily_cost_usd", value: modelSpend, unit: "usd" },
      { name: "budget_cap_usd", value: BUDGET_CAP_USD, unit: "usd" },
      { name: "budget_used_pct", value: BUDGET_CAP_USD > 0 ? (modelSpend / BUDGET_CAP_USD) * 100 : 0, unit: "%" },
    ];

    const alertsForRun = budgetAlerts.filter((a) => a.model === run.model && a.date === date) as BudgetAlert[];

    return {
      ...run,
      metrics,
      budget_exceeded: modelSpend > BUDGET_CAP_USD,
      alerts: alertsForRun,
    };
  });

  return NextResponse.json({ runs: runsWithBudget });
}

export async function GET() {
  try {
    const supabase = await createSupabaseClient();
    return handleAdminEvals(supabase);
  } catch (error) {
    return errorResponse(
      500,
      "internal_error",
      error instanceof Error ? error.message : "Unknown error",
      process.env.NODE_ENV === "development" && error instanceof Error ? error.stack ?? null : null,
    );
  }
}

// No inline mock traces — using real `agent_traces` table only.
