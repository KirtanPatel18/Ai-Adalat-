"use client";

import type { DocumentStatus, DocumentType, SupportedLanguage } from "@trionic/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

// ── locked values from types.ts ──────────────────────────────────────────────

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: "draft",      label: "Draft" },
  { value: "generating", label: "Generating" },
  { value: "final",      label: "Final" },
  { value: "failed",     label: "Failed" },
  { value: "exported",   label: "Exported" },
  { value: "archived",   label: "Archived" },
];

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
  { value: "mr", label: "Marathi" },
  { value: "ta", label: "Tamil" },
];

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "rti_application",     label: "RTI Application" },
  { value: "legal_notice",        label: "Legal Notice" },
  { value: "nda",                 label: "NDA" },
  { value: "consumer_complaint",  label: "Consumer Complaint" },
  { value: "cheque_bounce_notice",label: "Cheque Bounce Notice" },
];

// ── types ────────────────────────────────────────────────────────────────────

export type FilterState = {
  search:   string;
  status:   DocumentStatus | "all";
  language: SupportedLanguage | "all";
  doc_type: DocumentType | "all";
};

interface FilterBarProps {
  filters:  FilterState;
  onChange: (filters: FilterState) => void;
}

// ── component ────────────────────────────────────────────────────────────────

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasActiveFilters =
    filters.search   !== "" ||
    filters.status   !== "all" ||
    filters.language !== "all" ||
    filters.doc_type !== "all";

  function clearFilters() {
    onChange({ search: "", status: "all", language: "all", doc_type: "all" });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search documents..."
          value={filters.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ ...filters, search: e.target.value })
          }
          className="pl-9"
        />
      </div>

      {/* Status filter */}
      <Select
        value={filters.status}
        onValueChange={(v: string) =>
          onChange({ ...filters, status: v as DocumentStatus | "all" })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Language filter */}
      <Select
        value={filters.language}
        onValueChange={(v: string) =>
          onChange({ ...filters, language: v as SupportedLanguage | "all" })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All languages</SelectItem>
          {LANGUAGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Doc type filter */}
      <Select
        value={filters.doc_type}
        onValueChange={(v: string) =>
          onChange({ ...filters, doc_type: v as DocumentType | "all" })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Document type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {DOC_TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-zinc-500">
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
