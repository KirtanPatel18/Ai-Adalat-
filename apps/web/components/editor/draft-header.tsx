import { AlertCircle, CheckCircle2, Loader2, Save, PanelRight, ArrowLeft, Languages, Download } from "lucide-react";
import { SaveStatus } from "../../hooks/use-autosave";
import { useDraftStore } from "../../hooks/use-draft-store";
import { StatusBadge } from "../../app/[locale]/dashboard/_components/status-badge";
import Link from "next/link";
import { Button } from "../ui/button";
import { LanguageSwitcher } from "../language-switcher";
import { useTranslations } from "next-intl";

interface DraftHeaderProps {
  saveStatus: SaveStatus;
}

export function DraftHeader({ saveStatus }: DraftHeaderProps) {
  const documentData = useDraftStore((state) => state.document);
  const isCitationDrawerOpen = useDraftStore((state) => state.isCitationDrawerOpen);
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);

  const t = useTranslations("draft");
  const tCommon = useTranslations("common");
  const tActions = useTranslations("actions");

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3 shrink-0">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("back")}</span>
        </Link>

        <h1 className="text-base font-bold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
          {documentData?.title || t("title")}
        </h1>

        {documentData?.status && (
          <StatusBadge status={documentData.status} />
        )}
        
        {/* Pinned AI Banner */}
        <div className="hidden md:flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>{tCommon("disclaimer")}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Autosave Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground hidden sm:flex">
          {saveStatus === "idle" && (
            <>
              <Save className="h-4 w-4" />
              <span>{t("noChanges")}</span>
            </>
          )}
          {saveStatus === "unsaved" && (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{t("unsaved")}</span>
            </>
          )}
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-blue-500">{t("saving")}</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-500">{t("saved")}</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{t("error")}</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="outline" size="sm" className="hidden sm:flex" disabled>
            <Languages className="mr-2 h-4 w-4" />
            {tActions("translate")}
          </Button>
          
          <Button variant="default" size="sm" disabled>
            {tActions("export")}
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
            {isCitationDrawerOpen ? t("hideCitations") : t("citations")}
          </Button>
        </div>
      </div>
    </header>
  );
}
