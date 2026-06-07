"use client";

import { AlertCircle, CheckCircle2, Loader2, Save, PanelRight, ArrowLeft, Download, Languages } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { SaveStatus } from "../../hooks/use-autosave";
import { useDraftStore } from "../../hooks/use-draft-store";

interface DraftHeaderProps {
  saveStatus: SaveStatus;
}

export function DraftHeader({ saveStatus }: DraftHeaderProps) {
  const isCitationDrawerOpen = useDraftStore((state) => state.isCitationDrawerOpen);
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);
  const document = useDraftStore((state) => state.document);

  const renderStatusBadge = () => {
    if (!document) return null;
    
    switch (document.status) {
      case "generating":
        return (
          <div className="flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Generating</span>
          </div>
        );
      case "final":
        return (
          <div className="flex items-center gap-1.5 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950/50 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Final</span>
          </div>
        );
      case "failed":
        return (
          <div className="flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            <span>Failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            <span>Draft</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-lg font-semibold">{document?.title || "Legal Draft"}</h1>
        {renderStatusBadge()}
      </div>

      <div className="flex items-center gap-4">
        {/* Autosave Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground hidden sm:flex">
          {saveStatus === "idle" && (
            <>
              <Save className="h-4 w-4" />
              <span>No changes</span>
            </>
          )}
          {saveStatus === "unsaved" && (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved</span>
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
              <span className="text-destructive">Error</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex" disabled>
            <Languages className="mr-2 h-4 w-4" />
            Translate
          </Button>
          
          <Button variant="default" size="sm" disabled>
            Export
            <Download className="ml-2 h-4 w-4" />
          </Button>

          <Button
            variant={isCitationDrawerOpen ? "secondary" : "outline"}
            size="sm"
            onClick={toggleCitationDrawer}
            className="hidden lg:flex"
            aria-label="Toggle citation drawer"
          >
            <PanelRight className="mr-2 h-4 w-4" />
            {isCitationDrawerOpen ? "Hide Citations" : "Citations"}
          </Button>
        </div>
      </div>
    </header>
  );
}
