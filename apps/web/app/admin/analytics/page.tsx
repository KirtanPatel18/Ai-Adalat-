"use client";

import { useEffect, useState } from "react";
import type { Document, DocumentType, SupportedLanguage } from "@trionic/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocTypeCount = { type: DocumentType; count: number };
type LanguageCount = { language: SupportedLanguage; label: string; count: number; pct: string };
type ExportPerDay = { date: string; count: number };
type CitationCount = { act: string; count: number };

// ─── Mock Data (fallback when DB is empty) ────────────────────────────────────

const MOCK_DOC_TYPES: DocTypeCount[] = [
  { type: "rti_application", count: 42 },
  { type: "legal_notice", count: 31 },
  { type: "consumer_complaint", count: 27 },
  { type: "nda", count: 18 },
  { type: "cheque_bounce_notice", count: 14 },
];

const MOCK_LANGUAGES: LanguageCount[] = [
  { language: "en", label: "English", count: 55, pct: "40.7" },
  { language: "hi", label: "Hindi", count: 30, pct: "22.2" },
  { language: "gu", label: "Gujarati", count: 20, pct: "14.8" },
  { language: "mr", label: "Marathi", count: 10, pct: "7.4" },
  { language: "ta", label: "Tamil", count: 7, pct: "5.2" },
];

const MOCK_EXPORTS: ExportPerDay[] = [
  { date: "2026-05-21", count: 7 },
  { date: "2026-05-22", count: 15 },
  { date: "2026-05-23", count: 11 },
  { date: "2026-05-24", count: 9 },
  { date: "2026-05-25", count: 14 },
  { date: "2026-05-26", count: 10 },
  { date: "2026-05-27", count: 8 },
];

const MOCK_CONVERSION = { total: 120, exported: 87 };

const MOCK_CITATIONS: CitationCount[] = [
  { act: "IPC-1860", count: 54 },
  { act: "CrPC-1973", count: 41 },
  { act: "RTI-2005", count: 38 },
  { act: "CPA-2019", count: 29 },
  { act: "ICA-1872", count: 22 },
];

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "Hindi",
  gu: "Gujarati",
  mr: "Marathi",
  ta: "Tamil",
};

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  rti_application: "RTI Application",
  legal_notice: "Legal Notice",
  nda: "NDA",
  consumer_complaint: "Consumer Complaint",
  cheque_bounce_notice: "Cheque Bounce Notice",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [docTypes, setDocTypes] = useState<DocTypeCount[]>(MOCK_DOC_TYPES);
  const [languages, setLanguages] = useState<LanguageCount[]>(MOCK_LANGUAGES);
  const [exportsPerDay, setExportsPerDay] = useState<ExportPerDay[]>(MOCK_EXPORTS);
  const [conversion, setConversion] = useState(MOCK_CONVERSION);
  const [citations] = useState<CitationCount[]>(MOCK_CITATIONS);
  const [usingMock, setUsingMock] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/documents?limit=500", {
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as {
          documents?: Document[];
          error?: string;
          message?: string;
        } | null;

        if (!response.ok) {
            // API not available in dev — fall back to mock data silently
            setUsingMock(true);
            return;
        }
        const docs: Document[] = payload?.documents ?? [];

        if (cancelled) return;

        if (docs.length === 0) {
          // DB empty — keep mock data
          return;
        }

        setUsingMock(false);

        // ── Cell 1: Doc-type popularity ──────────────────────────────────
        const dtMap: Partial<Record<DocumentType, number>> = {};
        docs.forEach((d) => {
          dtMap[d.doc_type] = (dtMap[d.doc_type] ?? 0) + 1;
        });
        setDocTypes(
          (Object.entries(dtMap) as [DocumentType, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => ({ type, count }))
        );

        // ── Cell 2: Language distribution ────────────────────────────────
        const langMap: Partial<Record<SupportedLanguage, number>> = {};
        docs.forEach((d) => {
          langMap[d.language] = (langMap[d.language] ?? 0) + 1;
        });
        const total = docs.length;
        setLanguages(
          (Object.entries(langMap) as [SupportedLanguage, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([language, count]) => ({
              language,
              label: LANGUAGE_LABELS[language] ?? language,
              count,
              pct: ((count / total) * 100).toFixed(1),
            }))
        );

        // ── Cell 3: Exports per day (last 7 days) ────────────────────────
        const exportedDocs = docs.filter((d) => d.status === "final");
        const epdMap: Record<string, number> = {};
        exportedDocs.forEach((d) => {
          const date = d.updated_at.slice(0, 10);
          epdMap[date] = (epdMap[date] ?? 0) + 1;
        });
        setExportsPerDay(
          Object.entries(epdMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-7)
            .map(([date, count]) => ({ date, count }))
        );

        // ── Cell 4: Draft-to-export conversion % ─────────────────────────
        setConversion({
          total: docs.length,
          exported: exportedDocs.length,
        });

      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load analytics"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const conversionPct =
    conversion.total > 0
      ? ((conversion.exported / conversion.total) * 100).toFixed(1)
      : "0.0";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">

      {/* Header */}
      <section className="mx-auto mb-6 w-full max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Team F · Evals & Telemetry
          </p>
          <div className="mt-3 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Cohort Usage Analytics
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              Document usage metrics across the cohort — admin only.
            </p>
          </div>
          {usingMock && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800 border border-yellow-200">
              ⚠ Showing mock data — DB is empty
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="mx-auto w-full max-w-7xl rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading analytics…
        </div>
      ) : error ? (
        <div className="mx-auto w-full max-w-7xl rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-800">
          {error}
        </div>
      ) : (
        <section className="mx-auto w-full max-w-7xl space-y-6">

          {/* Row 1 — Doc type + Language */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Cell 1 — Doc-type popularity */}
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Document Type Popularity
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 text-right font-medium">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docTypes.map(({ type, count }) => (
                    <tr key={type}>
                      <td className="py-2 text-slate-700">
                        {DOC_TYPE_LABELS[type] ?? type}
                      </td>
                      <td className="py-2 text-right font-mono font-medium text-slate-900">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cell 2 — Language distribution */}
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Language Distribution
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="pb-2 font-medium">Language</th>
                    <th className="pb-2 text-right font-medium">Count</th>
                    <th className="pb-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {languages.map(({ language, label, count, pct }) => (
                    <tr key={language}>
                      <td className="py-2 text-slate-700">{label}</td>
                      <td className="py-2 text-right font-mono font-medium text-slate-900">
                        {count}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-500">
                        {pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 2 — Exports + Conversion */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Cell 3 — Exports per day */}
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Exports Per Day (last 7 days)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 text-right font-medium">Exports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exportsPerDay.map(({ date, count }) => (
                    <tr key={date}>
                      <td className="py-2 text-slate-700">{date}</td>
                      <td className="py-2 text-right font-mono font-medium text-slate-900">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cell 4 — Conversion % */}
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm flex flex-col items-center justify-center text-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Draft → Export Conversion
              </h2>
              <p className="text-6xl font-bold text-emerald-600">
                {conversionPct}%
              </p>
              <p className="text-sm text-slate-500">
                {conversion.exported} exported out of {conversion.total} total documents
              </p>
            </div>
          </div>

          {/* Cell 5 — Per-act citation frequency */}
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Per-Act Citation Frequency
              </h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                Mock — awaiting agent_traces route
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="pb-2 font-medium">Act</th>
                  <th className="pb-2 text-right font-medium">Citations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {citations.map(({ act, count }) => (
                  <tr key={act}>
                    <td className="py-2 font-mono text-slate-700">{act}</td>
                    <td className="py-2 text-right font-mono font-medium text-slate-900">
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>
      )}
    </main>
  );
}