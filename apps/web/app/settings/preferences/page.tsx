import React from "react";
import { SettingsHeader } from "@/components/settings/settings-header";
import { PreferencesForm } from "@/components/settings/preferences-form";

export default function PreferencesSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Preferences"
        description="Choose your localized system language, default theme, and select email digest notifications."
      />
      
      {/* TODO: Load active user preference record from Postgres to populate defaults */}
      <PreferencesForm />
    </div>
  );
}
