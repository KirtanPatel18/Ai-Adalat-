import { notFound } from "next/navigation";
import type { Document, Citation, SupportedLanguage, DocumentStatus, DocumentType } from "@trionic/shared";
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

    // Map DB representation to shared types
    let sharedDocType = document.doc_type;
    if (document.doc_type === 'petition') sharedDocType = 'rti_application';
    else if (document.doc_type === 'agreement') sharedDocType = 'nda';
    else if (document.doc_type === 'complaint') sharedDocType = 'consumer_complaint';
    else if (document.doc_type === 'notice') {
      if (document.title && /cheque/i.test(document.title)) {
        sharedDocType = 'cheque_bounce_notice';
      } else {
        sharedDocType = 'legal_notice';
      }
    }

    let sharedStatus = document.status;
    if (document.status === 'review') sharedStatus = 'generating';

    const mappedDocument: Document = {
      id: document.id,
      owner_id: document.owner_id,
      title: document.title,
      doc_type: sharedDocType as DocumentType,
      language: document.language as SupportedLanguage,
      status: sharedStatus as DocumentStatus,
      current_version_id: document.current_version_id || null,
      created_at: document.created_at,
      updated_at: document.updated_at,
    };

    return {
      document: mappedDocument,
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
