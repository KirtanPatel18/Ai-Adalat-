"use client";
import { useEffect, useState, useCallback } from "react";
import type { Document } from "@trionic/shared";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";import { FilterBar, type FilterState } from "./_components/filter-bar";
import { DocumentTable } from "./_components/document-table";
import { EmptyState } from "./_components/empty-state";

// ── types ────────────────────────────────────────────────────────────────────

type FetchState = "idle" | "loading" | "error" | "done";

// ── component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("idle");

const router = useRouter()
const supabase = createClient()

async function handleSignOut() {
  await supabase.auth.signOut()
  router.push('/auth/sign-in')
  router.refresh()
}

  const [filters, setFilters] = useState<FilterState>({
    search:   "",
    status:   "all",
    language: "all",
    doc_type: "all",
  });

  // ── fetch documents from GET /api/documents ────────────────────────────────
  // Passes server-side filter params per API_CONTRACTS.md:
  //   ?status=  ?doc_type=  ?language=
  // Search/title filter is client-side (API does not support it yet).

  const fetchDocuments = useCallback(async () => {
    setFetchState("loading");
    try {
      const params = new URLSearchParams();
      if (filters.status   !== "all") params.set("status",   filters.status);
      if (filters.language !== "all") params.set("language", filters.language);
      if (filters.doc_type !== "all") params.set("doc_type", filters.doc_type);

      const res = await fetch(`/api/documents?${params.toString()}`);

      if (!res.ok) {
        setFetchState("error");
        return;
      }

      // Response shape from API_CONTRACTS.md:
      // { documents: Document[]; next_cursor: string | null }
      const data = await res.json() as { documents: Document[]; next_cursor: string | null };
      setDocuments(data.documents);
      setFetchState("done");
    } catch {
      setFetchState("error");
    }
  }, [filters.status, filters.language, filters.doc_type]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── client-side search filter (title partial match) ────────────────────────
  const visibleDocuments = filters.search.trim()
    ? documents.filter((d) =>
        d.title.toLowerCase().includes(filters.search.toLowerCase())
      )
    : documents;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <main className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">My Documents</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            All your legal drafts in one place
          </p>
        </div>
        <div className="flex gap-2">
  <Button asChild className="gap-2">
    <Link href="/new">
      <Plus className="h-4 w-4" />
      New Draft
    </Link>
  </Button>
  <Button variant="outline" className="gap-2" onClick={handleSignOut}>
    <LogOut className="h-4 w-4" />
    Sign out
  </Button>
</div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Content */}
      {fetchState === "loading" && (
        <EmptyState type="loading" />
      )}

      {fetchState === "error" && (
        <EmptyState type="error" onRetry={fetchDocuments} />
      )}

      {fetchState === "done" && documents.length === 0 && (
        <EmptyState type="empty" />
      )}

      {fetchState === "done" && documents.length > 0 && visibleDocuments.length === 0 && (
        <EmptyState type="no-results" />
      )}

      {fetchState === "done" && visibleDocuments.length > 0 && (
        <DocumentTable documents={visibleDocuments} />
      )}

    </main>
  );
}
