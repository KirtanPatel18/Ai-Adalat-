"use client";

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Eye, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraftStore } from "../../hooks/use-draft-store";

interface DraftEditorProps {
  value: string;
  onChange: (value: string) => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  className?: string;
}

/**
 * Reusable DraftEditor component.
 * Uses a local state for immediate typing feedback to prevent cursor jumping
 * and debounces the `onChange` callback to prevent heavy parent re-renders.
 */
export function DraftEditor({
  value,
  onChange,
  isSaving = false,
  lastSavedAt,
  className,
}: DraftEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const selectCitation = useDraftStore((state) => state.selectCitation);

  // Sync local state if external value changes (e.g. initial server load)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced input handling
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  const renderPreview = (text: string) => {
    // Basic regex to find [CITE:node_id] markers
    const regex = /\[CITE:([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Push text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const nodeId = match[1];
      // Push the clickable citation badge
      parts.push(
        <button
          key={`cite-${match.index}`}
          onClick={() => selectCitation(nodeId)}
          title={`Click to view citation: ${nodeId}`}
          className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mx-1"
        >
          {nodeId}
        </button>
      );
      lastIndex = regex.lastIndex;
    }

    // Push remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div className="whitespace-pre-wrap font-mono text-sm md:text-base leading-relaxed text-foreground">
        {parts}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full w-full bg-background border rounded-md shadow-sm overflow-hidden", className)}>
      {/* Editor Header / Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-muted p-0.5">
            <button
              onClick={() => setMode("edit")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium transition-all",
                mode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Write
            </button>
            <button
              onClick={() => setMode("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium transition-all",
                mode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center text-xs font-medium transition-opacity duration-300">
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-blue-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </span>
          ) : lastSavedAt ? (
            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved at {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-muted-foreground/50">Ready</span>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        {mode === "edit" ? (
          <textarea
            value={localValue}
            onChange={handleChange}
            placeholder="Start drafting your legal document..."
            className="h-full w-full resize-none bg-transparent outline-none font-mono text-sm md:text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:ring-0"
            spellCheck={false}
          />
        ) : (
          renderPreview(localValue)
        )}
      </div>
    </div>
  );
}
