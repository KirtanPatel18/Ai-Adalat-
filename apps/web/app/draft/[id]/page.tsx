import { notFound } from "next/navigation";
import type { Document, Citation } from "@trionic/shared";
import { DraftWorkspace } from "@/components/editor/draft-workspace";
import { createClient } from "@/lib/supabase/server";

/**
 * Draft Editor Server Component
 * 
 * Fetches the initial data securely on the server and passes it down to the 
 * interactive Client Component workspace.
 */
export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = await createClient();

  // --- DEMO MODE FALLBACK ---
  if (id.startsWith("mock-")) {
    const mockDocument: Document = {
      id,
      owner_id: "user-1",
      title: id === "mock-1" ? "RTI – Municipal records" : id === "mock-2" ? "Legal notice – Tenant deposit" : "NDA – Freelance contract",
      doc_type: id === "mock-1" ? "rti_application" : id === "mock-2" ? "legal_notice" : "nda",
      status: id === "mock-1" ? "generating" : id === "mock-2" ? "final" : "exported",
      language: id === "mock-2" ? "hi" : "en",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_version_id: "v1",
    };

    const mockContent = id === "mock-2" 
      ? "यह एक कानूनी नोटिस है। अधिक जानकारी के लिए [CITE:CONTRACT-1872/S-73] देखें।"
      : "Under Section 6(1) of the RTI Act [CITE:RTI-2005/S-6], I hereby request the following information regarding municipal expenditure. Please provide the response within 30 days as mandated by [CITE:RTI-2005/S-7].";

    return (
      <DraftWorkspace
        documentId={id}
        initialDocument={mockDocument}
        initialContent={mockContent}
        initialCitations={[]}
      />
    );
  }
  // --- END DEMO MODE ---

  // 1. Fetch document metadata
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (docError || !document) {
    notFound();
  }

  // 2. Fetch the latest document version content
  const { data: latestVersion, error: versionError } = await supabase
    .from("document_versions")
    .select("body_markdown")
    .eq("document_id", id)
    .order("version_num", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Default to empty content if no version exists yet
  const content = latestVersion?.body_markdown || "";

  // 3. Delegate to the Client Component orchestrator
  return (
    <DraftWorkspace
      documentId={id}
      initialDocument={document as Document}
      initialContent={content}
      initialCitations={[]}
    />
  );
}
