"use client";

import { X, BookOpenText, Info } from "lucide-react";
import { useDraftStore } from "../../hooks/use-draft-store";

export function CitationDrawer() {
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);

  return (
    <div className="flex h-full w-full flex-col bg-card shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-border/50 relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/30 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <BookOpenText className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Citations</h2>
        </div>
        <button 
          onClick={toggleCitationDrawer}
          className="rounded-md p-1.5 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
          
          <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
            <Info className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-2 max-w-[250px]">
            <h3 className="font-semibold tracking-tight text-foreground">
              Feature Preview
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Citation drawer integration coming in Week 3. This module will eventually display verified legal references and act snapshots.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
