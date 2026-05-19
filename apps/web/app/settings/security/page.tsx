import React from "react";
import { SettingsHeader } from "@/components/settings/settings-header";
import { SecurityForm } from "@/components/settings/security-form";
import { DangerZone } from "@/components/settings/danger-zone";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-10">
      <div>
        <SettingsHeader
          title="Security & Access"
          description="Update credentials, monitor active browser/device sessions, and configure account deletion operations."
        />
        
        {/* TODO: Authenticated session check wrapper. Users must re-authenticate to view sessions or change password. */}
        <SecurityForm />
      </div>

      <div className="pt-6 border-t border-border">
        <DangerZone />
      </div>
    </div>
  );
}
