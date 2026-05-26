import React from "react";
import { SettingsHeader } from "@/components/settings/settings-header";
import { ProfileForm } from "@/components/settings/profile-form";

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Personal Profile"
        description="Update your username, public name, phone number, and upload a profile picture."
      />
      
      {/* TODO: Fetch user session on server side and pass profile data as initial props */}
      {/* Example:
          const { data: { user } } = await supabase.auth.getUser();
          const profile = await db.profiles.findUnique({ where: { id: user.id } });
      */}
      <ProfileForm />
    </div>
  );
}
