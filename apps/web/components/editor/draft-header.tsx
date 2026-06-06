import { AlertCircle, CheckCircle2, Loader2, Save, PanelRight, ArrowLeft } from "lucide-react";
import { SaveStatus } from "../../hooks/use-autosave";
import { useDraftStore } from "../../hooks/use-draft-store";
import { StatusBadge } from "../../app/dashboard/_components/status-badge";
import Link from "next/link";

interface DraftHeaderProps {
  saveStatus: SaveStatus;
}

export function DraftHeader({ saveStatus }: DraftHeaderProps) {
  const documentData = useDraftStore((state) => state.document);
  const isCitationDrawerOpen = useDraftStore((state) => state.isCitationDrawerOpen);
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3 shrink-0">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        <h1 className="text-base font-bold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
          {documentData?.title || "Legal Draft"}
        </h1>

        {documentData?.status && (
          <StatusBadge status={documentData.status} />
        )}
        
        {/* Pinned AI Banner */}
        <div className="hidden md:flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
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
