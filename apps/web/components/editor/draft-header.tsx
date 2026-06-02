"use client";

import { AlertCircle, CheckCircle2, Loader2, Save, PanelRight } from "lucide-react";
import { SaveStatus } from "../../hooks/use-autosave";
import { useDraftStore } from "../../hooks/use-draft-store";

interface DraftHeaderProps {
  saveStatus: SaveStatus;
}

export function DraftHeader({ saveStatus }: DraftHeaderProps) {
  const isCitationDrawerOpen = useDraftStore((state) => state.isCitationDrawerOpen);
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Legal Draft</h1>
        
        {/* Pinned AI Banner */}
        <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <span>AI-generated draft — not legal advice</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Autosave Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saveStatus === "idle" && (
            <>
              <Save className="h-4 w-4" />
              <span>No changes</span>
            </>
          )}
          {saveStatus === "unsaved" && (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved changes</span>
            </>
          )}
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-blue-500">Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Saved</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Failed to save</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Citation Drawer Toggle */}
        <button
          onClick={toggleCitationDrawer}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isCitationDrawerOpen 
              ? "bg-primary/10 text-primary hover:bg-primary/20" 
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
          aria-label="Toggle citation drawer"
        >
          <PanelRight className="h-4 w-4" />
          <span>{isCitationDrawerOpen ? "Hide Citations" : "View Citations"}</span>
        </button>
      </div>
    </header>
  );
}
