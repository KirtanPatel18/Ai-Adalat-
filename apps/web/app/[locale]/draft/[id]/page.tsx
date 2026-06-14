import { notFound } from "next/navigation";
import type { Document, Citation, SupportedLanguage, DocumentStatus, DocumentType } from "@trionic/shared";
import { DraftWorkspace } from "@/components/editor/draft-workspace";
import { createClient } from "@/lib/supabase/server";

const TITLES: Record<string, string> = {
  en: "Notice for Cheque Bounce",
  hi: "चेक बाउंस के लिए कानूनी नोटिस",
  gu: "ચેક બાઉન્સ માટે કાનૂની નોટિસ",
  mr: "चेक बाऊन्ससाठी कायदेशीर नोटीस",
  ta: "காசோலை திரும்பியதற்கான சட்ட அறிவிப்பு",
};

const CONTENTS: Record<string, string> = {
  en: `# LEGAL NOTICE\n\n**UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881**\n\nTo,\n[Client Name]\n[Address]\n\nSubject: Notice for dishonour of Cheque No. XXXXXX\n\nSir/Madam,\n\nUnder instructions from and on behalf of my client...`,
  hi: `# विधिक सूचना\n\n**परक्राम्य लिखत अधिनियम, 1881 की धारा 138 के तहत**\n\nसेवा में,\n[ग्राहक का नाम]\n[पता]\n\nविषय: चेक संख्या XXXXXX के अनादर के लिए नोटिस\n\nमहोदय/महोदया,\n\nअपने मुवक्किल की ओर से और उनके निर्देशानुसार...`,
  gu: `# કાનૂની નોટિસ\n\n**નેગોશિયેબલ ઇન્સ્ટ્રુમેન્ટ્સ એક્ટ, 1881 ની કલમ 138 હેઠળ**\n\nપ્રતિ,\n[ગ્રાહકનું નામ]\n[સરનામું]\n\nવિષય: ચેક નંબર XXXXXX ના અનાદર માટેની નોટિસ\n\nશ્રીમાન/શ્રીમતી,\n\nમારા અસીલની સૂચનાથી અને તેમના વતી...`,
  mr: `# कायदेशीर नोटीस\n\n**नेगोशिएबल इन्स्ट्रुमेंट्स ॲक्ट, १८८१ च्या कलम १३८ अंतर्गत**\n\nप्रति,\n[ग्राहकाचे नाव]\n[पत्ता]\n\nविषय: धनादेश क्रमांक XXXXXX अनादरासाठी नोटीस\n\nमहोदय/महोदया,\n\nमाझ्या क्लायंटच्या वतीने आणि त्यांच्या सूचनेनुसार...`,
  ta: `# சட்ட அறிவிப்பு\n\n**மாற்றுச் சீட்டுச் சட்டம், 1881 இன் பிரிவு 138 இன் கீழ்**\n\nபெறுநர்,\n[வாடிக்கையாளர் பெயர்]\n[முகவரி]\n\nபொருள்: காசோலை எண் XXXXXX திரும்பியதற்கான அறிவிப்பு\n\nஐயா/அம்மா,\n\nஎனது வாடிக்கையாளரின் அறிவுறுத்தலின்படியும் அவர் சார்பாகவும்...`
};

/**
 * Mock Data Fetcher
 * Simulates a server-side DB query to fetch the draft document.
 */
async function getMockDocument(id: string, locale: string): Promise<{ document: Document; content: string; citations: Citation[] } | null> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Handle mock 404
  if (id === "404") return null;

  const mockDocument: Document = {
    id,
    owner_id: "user-123",
    doc_type: "legal_notice",
    language: (["en", "hi", "gu", "mr", "ta"].includes(locale) ? locale : "en") as any,
    title: TITLES[locale] || TITLES.en,
    status: "generating", // "generating" indicates AI is actively streaming/working
    current_version_id: "v1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    document: mockDocument,
    content: CONTENTS[locale] || CONTENTS.en,
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
 */
export default async function DraftPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  
  // 1. Fetch real server data
  let data = await getRealDocument(id);
  
  // 2. Fallback to mock data for local testing
  if (!data) {
    data = await getMockDocument(id, locale);
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
