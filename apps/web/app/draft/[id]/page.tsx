import { notFound } from "next/navigation";
import type { Document, Citation } from "@trionic/shared";
import { DraftWorkspace } from "@/components/editor/draft-workspace";

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

/**
 * Draft Editor Server Component
 * 
 * Fetches the initial data securely on the server and passes it down to the 
 * interactive Client Component workspace.
 */
export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // 1. Fetch initial server data
  const data = await getMockDocument(id);
  
  // 2. Handle not found gracefully (triggers Next.js not-found.tsx)
  if (!data) {
    notFound();
  }

  // 3. Delegate to the Client Component orchestrator
  return (
    <DraftWorkspace
      documentId={id}
      initialDocument={data.document}
      initialContent={data.content}
      initialCitations={data.citations}
    />
  );
}
