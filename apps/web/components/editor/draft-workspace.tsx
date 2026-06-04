"use client";

import { useEffect } from "react";
import { useDraftStore } from "../../hooks/use-draft-store";
import { useAutosave } from "../../hooks/use-autosave";
import { DraftHeader } from "./draft-header";
import { DraftEditor } from "./draft-editor";
import { CitationDrawer } from "./citation-drawer";
import type { Document, Citation } from "@trionic/shared";
import { cn } from "@/lib/utils";

interface DraftWorkspaceProps {
  documentId: string;
  initialDocument: Document;
  initialContent: string;
  initialCitations: Citation[];
}

export function DraftWorkspace({
  documentId,
  initialDocument,
  initialContent,
  initialCitations,
}: DraftWorkspaceProps) {
  const content = useDraftStore((state) => state.content);
  const setContent = useDraftStore((state) => state.setContent);
  const setDocument = useDraftStore((state) => state.setDocument);
  const isCitationDrawerOpen = useDraftStore((state) => state.isCitationDrawerOpen);

  // Initialize store with server data on mount
  useEffect(() => {
    setDocument(initialDocument, initialContent, initialCitations);
  }, [initialDocument, initialContent, initialCitations, setDocument]);

  // Activate decoupled autosave hook
  const { saveStatus, lastSavedAt } = useAutosave({
    documentId,
    value: content,
  });

  return (
    <div className="flex h-screen flex-col bg-background">
      <DraftHeader saveStatus={saveStatus} />
      
      {/* Two Pane Layout */}
      <div className="flex h-[calc(100vh-65px)] w-full overflow-hidden">
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
