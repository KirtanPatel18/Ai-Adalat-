"use client";

import type { Document } from "@trionic/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./status-badge";

// ── helpers ──────────────────────────────────────────────────────────────────

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  gu: "Gujarati",
  mr: "Marathi",
  ta: "Tamil",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  rti_application:      "RTI Application",
  legal_notice:         "Legal Notice",
  nda:                  "NDA",
  consumer_complaint:   "Consumer Complaint",
  cheque_bounce_notice: "Cheque Bounce Notice",
};

/** Formats an ISO timestamp as a relative string using only built-in Intl API — no date-fns needed. */
function formatDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);

    if (mins  <  1) return "just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  <  7) return `${days}d ago`;

    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── component ────────────────────────────────────────────────────────────────

interface DocumentTableProps {
  documents: Document[];
}

export function DocumentTable({ documents }: DocumentTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50 hover:bg-zinc-50">
            <TableHead className="font-semibold text-zinc-700 w-[35%]">Title</TableHead>
            <TableHead className="font-semibold text-zinc-700">Type</TableHead>
            <TableHead className="font-semibold text-zinc-700">Language</TableHead>
            <TableHead className="font-semibold text-zinc-700">Status</TableHead>
            <TableHead className="font-semibold text-zinc-700 text-right">Last Modified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow
              key={doc.id}
              className="cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => router.push(`/draft/${doc.id}`)}
            >
              <TableCell className="font-medium text-zinc-900 max-w-xs truncate">
                {doc.title || "Untitled"}
              </TableCell>
              <TableCell className="text-zinc-600 text-sm">
                {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
              </TableCell>
              <TableCell className="text-zinc-600 text-sm">
                {LANGUAGE_LABELS[doc.language] ?? doc.language}
              </TableCell>
              <TableCell>
                <StatusBadge status={doc.status} />
              </TableCell>
              <TableCell className="text-zinc-500 text-sm text-right">
                {formatDate(doc.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
