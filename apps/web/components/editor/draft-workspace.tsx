"use client";

import { useEffect, useState } from "react";
import { useDraftStore } from "../../hooks/use-draft-store";
import { useAutosave } from "../../hooks/use-autosave";
import { DraftHeader } from "./draft-header";
import { DraftEditor } from "./draft-editor";
import { CitationDrawer } from "./citation-drawer";
import type { Document, Citation } from "@trionic/shared";
import { cn } from "@/lib/utils";

import { useTranslations } from "next-intl";

interface DraftWorkspaceProps {
  documentId: string;
  initialDocument: Document;
  initialContent: string;
  initialCitations: Citation[];
}

function DraftWorkspaceInner({
  documentId,
  initialDocument,
}: DraftWorkspaceProps) {
  const content = useDraftStore((state) => state.content);
  const setContent = useDraftStore((state) => state.setContent);
  const isCitationDrawerOpen = useDraftStore((state) => state.isCitationDrawerOpen);
  const docType =
    useDraftStore((state) => state.document?.doc_type) ?? initialDocument.doc_type;
  const tCommon = useTranslations("common");

  // Activate decoupled autosave hook
  const { saveStatus, lastSavedAt } = useAutosave({
    documentId,
    value: content,
  });

  return (
    <div className="flex h-screen flex-col bg-background">
      <DraftHeader saveStatus={saveStatus} />

      {/* Global Warning Banner */}
      <div className="flex items-center justify-center bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-400 border-b border-amber-500/20">
        <span className="mr-2">⚠</span>
        {tCommon("disclaimer")}
      </div>

      {/* Two Pane Layout */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Pane: Editor */}
        <div
          className={cn(
            "flex-1 overflow-hidden transition-all duration-300",
            isCitationDrawerOpen ? "w-2/3" : "w-full"
          )}
        >
          <DraftEditor
            value={content}
            onChange={setContent}
            isSaving={saveStatus === "saving"}
            lastSavedAt={lastSavedAt}
            docType={docType}
          />
        </div>

        {/* Right Pane: Citation Drawer */}
        {isCitationDrawerOpen && (
          <div className="w-1/3 min-w-[300px] max-w-[500px] border-l bg-muted/20 overflow-hidden">
            <CitationDrawer />
          </div>
        )}
      </div>
    </div>
  );
}

export function DraftWorkspace(props: DraftWorkspaceProps) {
  const { documentId, initialDocument, initialContent, initialCitations } = props;
  const setDocument = useDraftStore((state) => state.setDocument);
  const [readyId, setReadyId] = useState<string | null>(null);

  // Load the server data into the store first. The editor and autosave mount
  // only after this, so they never see the previous document's content.
  useEffect(() => {
    const resolvedCitations = initialCitations && initialCitations.length > 0
      ? initialCitations
      : Array.from(initialContent.matchAll(/\[CITE:([^\]]+)\]/g)).map((match) => ({
          node_id: match[1],
          snapshot_id: "2026-05-28",
          span: [match.index!, match.index! + match[0].length] as [number, number]
        }));
    setDocument(initialDocument, initialContent, resolvedCitations);
    setReadyId(documentId);
  }, [documentId, initialDocument, initialContent, initialCitations, setDocument]);

  if (readyId !== documentId) return null;

  return <DraftWorkspaceInner key={documentId} {...props} />;
}