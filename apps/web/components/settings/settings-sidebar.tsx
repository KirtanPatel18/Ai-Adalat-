"use client";

import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { User, Settings, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  name: string;
  href: string;
  hash: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigationItems: SidebarItem[] = [
  {
    name: "Profile",
    href: "/settings",
    hash: "#profile",
    icon: User,
    description: "Manage your personal details and email",
  },
  {
    name: "Preferences",
    href: "/settings",
    hash: "#preferences",
    icon: Settings,
    description: "Change language settings and notifications",
  },
  {
    name: "Security",
    href: "/settings",
    hash: "#sessions",
    icon: ShieldAlert,
    description: "Track active sessions and manage danger zone",
  },
];

export function SettingsSidebar() {
  const [activeHash, setActiveHash] = useState("#profile");

  useEffect(() => {
    // Set initial active section from hash or default to profile
    if (window.location.hash) {
      setActiveHash(window.location.hash);
    }

    const handleHashChange = () => {
      setActiveHash(window.location.hash || "#profile");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <nav
      aria-label="Settings navigation"
      className="w-full md:w-64 shrink-0"
    >
      {/* Mobile Horizontal Tabs Navigation */}
      <div className="flex md:hidden border-b border-border overflow-x-auto scrollbar-none -mx-4 px-4 gap-2 mb-6">
        {navigationItems.map((item) => {
          const isActive = activeHash === item.hash;
          const Icon = item.icon;

          return (
            <Link
              key={item.hash}
              href={`${item.href}${item.hash}`}
              onClick={() => setActiveHash(item.hash)}
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
          const isActive = activeHash === item.hash;
          const Icon = item.icon;

          return (
            <Link
              key={item.hash}
              href={`${item.href}${item.hash}`}
              onClick={() => setActiveHash(item.hash)}
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
