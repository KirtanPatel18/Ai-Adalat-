import { FileText, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type EmptyStateType = "empty" | "loading" | "error" | "no-results";

const config = {
  empty: {
    icon: FileText,
    title: "No drafts yet",
    description: "You haven't created any legal drafts yet. Start by creating your first document.",
    action: (
      <Button asChild>
        <Link href="/new">+ New Draft</Link>
      </Button>
    ),
  },
  "no-results": {
    icon: SearchX,
    title: "No results found",
    description: "No documents match your current filters. Try adjusting or clearing your filters.",
    action: null,
  },
  error: {
    icon: RefreshCw,
    title: "Failed to load documents",
    description: "Something went wrong while fetching your documents. Please try again.",
    action: null, // caller passes onRetry
  },
  loading: {
    icon: null,
    title: "",
    description: "",
    action: null,
  },
};

interface EmptyStateProps {
  type: EmptyStateType;
  onRetry?: () => void;
}

export function EmptyState({ type, onRetry }: EmptyStateProps) {
  if (type === "loading") {
    return (
      <div className="flex flex-col gap-3 py-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 w-full rounded-lg bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const { icon: Icon, title, description, action } = config[type];

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <Icon className="h-6 w-6 text-zinc-400" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-zinc-800">{title}</p>
        <p className="text-sm text-zinc-500 max-w-sm">{description}</p>
      </div>
      {type === "error" && onRetry ? (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      ) : (
        action
      )}
    </div>
  );
}
