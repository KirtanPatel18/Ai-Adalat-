import { FileText, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

type EmptyStateType = "empty" | "loading" | "error" | "no-results";

const config = {
  empty: {
    icon: FileText,
  },
  "no-results": {
    icon: SearchX,
  },
  error: {
    icon: RefreshCw,
  },
  loading: {
    icon: null,
  },
};

interface EmptyStateProps {
  type: EmptyStateType;
  onRetry?: () => void;
}

export function EmptyState({ type, onRetry }: EmptyStateProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  if (type === "loading") {
    return (
      <div className="flex flex-col gap-3 py-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 w-full rounded-lg bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const { icon: Icon } = config[type];

  // Dynamic localized lookup
  let title = "";
  let description = "";
  let action: React.ReactNode = null;

  if (type === "empty") {
    title = t("emptyStateTitle");
    description = t("emptyStateDesc");
    action = (
      <Button asChild className="cursor-pointer">
        <Link href="/new">{tCommon("newDraft")}</Link>
      </Button>
    );
  } else if (type === "no-results") {
    title = t("noResultsTitle");
    description = t("noResultsDesc");
  } else if (type === "error") {
    title = t("failedToLoadTitle");
    description = t("failedToLoadDesc");
  }

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
        <Button variant="outline" onClick={onRetry} className="gap-2 cursor-pointer">
          <RefreshCw className="h-4 w-4" />
          {tCommon("tryAgain")}
        </Button>
      ) : (
        action
      )}
    </div>
  );
}
