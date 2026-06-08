import { notFound } from "next/navigation";
import type { Document, Citation } from "@trionic/shared";
import { DraftWorkspace } from "@/components/editor/draft-workspace";
import { createClient } from "@/lib/supabase/server";

/**
 * Mock Data Fetcher
 * Simulates a server-side DB query to fetch the draft document.
 */
async function getMockDocument(id: string): Promise<{ document: Document; content: string; citations: Citation[] } | null> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Handle mock 404
  if (id === "404") return null;

  const mockDocument: Document = {
    id,
    owner_id: "user-123",
    doc_type: "legal_notice",
    language: "en",
    title: "Notice for Cheque Bounce",
    status: "generating", // "generating" indicates AI is actively streaming/working
    current_version_id: "v1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockContent = `# LEGAL NOTICE

**UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881**

To,
[Client Name]
[Address]

Subject: Notice for dishonour of Cheque No. XXXXXX

Sir/Madam,

Under instructions from and on behalf of my client...
`;

  return {
    document: mockDocument,
    content: mockContent,
    citations: [],
  };
}

/** Fetch real document from Supabase DB */
async function getRealDocument(id: string): Promise<{ document: Document; content: string; citations: Citation[] } | null> {
  try {
    const supabase = await createClient();

    // Fetch the authenticated user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn("[DraftPage] User is not authenticated, falling back to mock.");
      return null;
    }

    // Query documents
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (docError || !document) {
      console.warn("[DraftPage] Document query returned empty/error, falling back to mock:", docError?.message);
      return null;
    }

    // Query latest document version
    const { data: versions, error: verError } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", id)
      .order("version_num", { ascending: false })
      .limit(1);

    const latestVersion = versions?.[0];
    const content = latestVersion?.body_markdown ?? document.intake_text ?? "";

    // Parse citations dynamically from markdown
    const citations = Array.from(content.matchAll(/\[CITE:([^\]]+)\]/g)).map((match: any) => ({
      node_id: match[1],
      snapshot_id: "2026-05-28",
      span: [match.index!, match.index! + match[0].length] as [number, number]
    }));

    return {
      document: document as Document,
      content,
      citations,
    };
  } catch (err) {
    console.warn("[DraftPage] Database error occurred, falling back to mock:", err);
    return null;
  }
}

/**
 * Draft Editor Server Component
 * 
 * Fetches the initial data securely on the server and passes it down to the 
 * interactive Client Component workspace.
 */
export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // 1. Fetch real server data
  let data = await getRealDocument(id);
  
  // 2. Fallback to mock data for local testing
  if (!data) {
    data = await getMockDocument(id);
  }
  
  // 3. Handle not found gracefully
  if (!data) {
    notFound();
  }

  // 4. Delegate to the Client Component orchestrator
  return (
    <DraftWorkspace
      documentId={id}
      initialDocument={data.document}
      initialContent={data.content}
      initialCitations={data.citations}
    />
  );
}
