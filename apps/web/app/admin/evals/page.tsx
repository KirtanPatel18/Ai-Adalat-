"use client";

import { useEffect, useState } from "react";
import type { EvalRunResult } from "@trionic/shared";

const MODEL_OPTIONS = [
  "all",
  "claude-opus",
  "claude-sonnet",
  "gpt-4",
  "gemini-pro",
] as const;

type ModelFilter = (typeof MODEL_OPTIONS)[number];

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");
const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function getMetricValue(run: EvalRunResult, metricName: string): number {
  return run.metrics.find((metric) => metric.name === metricName)?.value ?? 0;
}

function formatDate(isoDate: string): string {
  return DATE_FORMATTER.format(new Date(isoDate));
}

export default function AdminEvalsPage() {
  const [runs, setRuns] = useState<EvalRunResult[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRuns() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/admin/evals", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { runs?: EvalRunResult[]; error?: string; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? payload?.error ?? `Request failed (${response.status})`);
        }

        if (!cancelled) {
          setRuns(Array.isArray(payload?.runs) ? payload.runs : []);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load eval dashboard");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRuns();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRuns = runs
    .filter((run) => selectedModel === "all" || run.model === selectedModel)
    .sort((left, right) => right.ran_at.localeCompare(left.ran_at) || left.model.localeCompare(right.model));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Team F · Evals & Telemetry
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Per-LLM Evaluation Dashboard
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Daily cost and latency for the last 14 days, aggregated from agent traces.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Model filter
              <select
                className="min-w-48 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value as ModelFilter)}
              >
                <option value="all">All models</option>
                <option value="claude-opus">claude-opus</option>
                <option value="claude-sonnet">claude-sonnet</option>
                <option value="gpt-4">gpt-4</option>
                <option value="gemini-pro">gemini-pro</option>
              </select>
            </label>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">
            Loading eval runs…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-800 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full border-collapse text-left">
                <thead className="bg-slate-950 text-xs uppercase tracking-[0.22em] text-slate-200">
                  <tr>
                    <th className="px-5 py-4 font-medium">Date</th>
                    <th className="px-5 py-4 font-medium">Model</th>
                    <th className="px-5 py-4 font-medium">Total Calls</th>
                    <th className="px-5 py-4 font-medium">Tokens In</th>
                    <th className="px-5 py-4 font-medium">Tokens Out</th>
                    <th className="px-5 py-4 font-medium">Cost ($)</th>
                    <th className="px-5 py-4 font-medium">P50 Latency (ms)</th>
                    <th className="px-5 py-4 font-medium">P95 Latency (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {visibleRuns.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-slate-500" colSpan={8}>
                        No eval runs found for the selected model.
                      </td>
                    </tr>
                  ) : (
                    visibleRuns.map((run) => (
                      <tr key={run.run_id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {formatDate(run.ran_at)}
                        </td>
                        <td className="px-5 py-4">{run.model}</td>
                        <td className="px-5 py-4">{NUMBER_FORMATTER.format(getMetricValue(run, "total_calls"))}</td>
                        <td className="px-5 py-4">{NUMBER_FORMATTER.format(getMetricValue(run, "total_tokens_in"))}</td>
                        <td className="px-5 py-4">{NUMBER_FORMATTER.format(getMetricValue(run, "total_tokens_out"))}</td>
                        <td className="px-5 py-4">{CURRENCY_FORMATTER.format(getMetricValue(run, "total_cost_usd"))}</td>
                        <td className="px-5 py-4">{NUMBER_FORMATTER.format(getMetricValue(run, "p50_latency_ms"))}</td>
                        <td className="px-5 py-4">{NUMBER_FORMATTER.format(getMetricValue(run, "p95_latency_ms"))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
