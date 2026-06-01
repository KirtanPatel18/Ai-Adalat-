"use client";

import React, { useState } from "react";
import type { User } from "@trionic/shared";
import { ProfileSection } from "@/components/settings/profile-section";
import { PreferencesSection } from "@/components/settings/preferences-section";
import { SessionsSection } from "@/components/settings/sessions-section";
import { DangerZoneSection } from "@/components/settings/danger-zone-section";

export default function SettingsPage() {
  // Use mock user data conforming to User from @trionic/shared
  const [user, setUser] = useState<User>({
    id: "1",
    email: "sunny@example.com",
    display_name: "Sunny Radadiya",
    default_language: "en",
    onboarded_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  const handleUpdateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => ({
      ...prev,
      ...updatedFields,
    }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-0 md:px-4 py-2 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Profile Section */}
      <div id="profile">
        <ProfileSection initialUser={user} onUpdateUser={handleUpdateUser} />
      </div>

      {/* Preferences Section */}
      <div id="preferences">
        <PreferencesSection initialUser={user} onUpdateUser={handleUpdateUser} />
      </div>

      {/* Sessions Section */}
      <div id="sessions">
        <SessionsSection />
      </div>

      {/* Danger Zone Section */}
      <div id="danger-zone">
        <DangerZoneSection />
      </div>
    </div>
  );
}
