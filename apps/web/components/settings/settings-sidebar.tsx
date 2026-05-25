"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Settings, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigationItems: SidebarItem[] = [
  {
    name: "Profile",
    href: "/settings/profile",
    icon: User,
    description: "Manage your personal details and avatar",
  },
  {
    name: "Preferences",
    href: "/settings/preferences",
    icon: Settings,
    description: "Change language settings and notifications",
  },
  {
    name: "Security",
    href: "/settings/security",
    icon: ShieldAlert,
    description: "Update password, view sessions, and account deletion",
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings navigation"
      className="w-full md:w-64 shrink-0"
    >
      {/* Mobile Horizontal Tabs Navigation */}
      <div className="flex md:hidden border-b border-border overflow-x-auto scrollbar-none -mx-4 px-4 gap-2 mb-6">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors outline-none focus-visible:bg-muted",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop Vertical Sidebar Navigation */}
      <div className="hidden md:flex flex-col gap-1 w-full">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-secondary text-secondary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform duration-200 group-hover:scale-105",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-foreground">{item.name}</span>
                <span className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground/80 line-clamp-1">
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
