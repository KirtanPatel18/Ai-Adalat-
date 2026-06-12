"use client";

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Local state for immediate typing response
  const [localValue, setLocalValue] = useState(value);

  // Sync local state if external value changes (e.g. initial server load)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced input handling
  // Fires the parent onChange only after the user stops typing for 500ms
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

  return (
    <div className={cn("flex flex-col h-full w-full bg-background border rounded-md shadow-sm overflow-hidden", className)}>
      {/* Editor Header / Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
        <div className="text-sm font-medium text-muted-foreground select-none">
          Markdown Editor
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
      <div className="relative flex-1 p-4 md:p-6 lg:p-8">
        <textarea
          value={localValue}
          onChange={handleChange}
          placeholder="Start drafting your legal document..."
          className="h-full w-full resize-none bg-transparent outline-none font-mono text-sm md:text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:ring-0"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
