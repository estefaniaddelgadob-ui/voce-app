"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Mic, UserCircle, Users,
  FilePlus, Library, CalendarDays, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase";

// ── Route definitions ──────────────────────────────────────────────────────────

const MOBILE_NAV = [
  { label: "Home",    href: "/dashboard",   icon: LayoutDashboard },
  { label: "Record",  href: "/record",      icon: Mic },
  { label: "Content", href: "/content/new", icon: FilePlus },
  { label: "Library", href: "/library",     icon: Library },
  { label: "Settings",href: "/settings",    icon: Settings },
] as const;

const DESKTOP_NAV = [
  { label: "Dashboard",  href: "/dashboard",       icon: LayoutDashboard },
  { label: "Record",     href: "/record",           icon: Mic },
  { label: "My Persona", href: "/my-persona",       icon: UserCircle },
  { label: "Audiences",  href: "/my-audiences",     icon: Users },
  { label: "Content",    href: "/content/new",      icon: FilePlus },
  { label: "Library",    href: "/library",          icon: Library },
  { label: "Schedule",   href: "/content/calendar", icon: CalendarDays },
] as const;

// ── Active-path helper ─────────────────────────────────────────────────────────

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (href === "/content/new")      return pathname === "/content/new";
    if (href === "/content/calendar") return pathname.startsWith("/content/calendar");
    return pathname === href || pathname.startsWith(href + "/");
  };
}

// ── Mobile bottom navigation ───────────────────────────────────────────────────

export function BottomNav() {
  const isActive = useIsActive();

  return (
    /* shown only below md; height is h-16 (64px) + iOS safe-area inset */
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#E2E2E0] bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {MOBILE_NAV.map(({ label, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              /* 44px minimum touch target — h-16 gives 64px */
              "flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-voce-indigo" : "text-[#94A3B8]"
            )}
          >
            <Icon
              className={cn(
                "h-[22px] w-[22px] shrink-0",
                active ? "text-voce-indigo" : "text-[#94A3B8]"
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Desktop sidebar ────────────────────────────────────────────────────────────

function SidebarLink({
  href, icon: Icon, label, active,
}: {
  href: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-voce-indigo/10 text-voce-indigo"
          : "text-[#64748B] hover:bg-[#F4F4F2] hover:text-[#0F172A]"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-voce-indigo" : "text-[#94A3B8]"
        )}
      />
      <span className="truncate">{label}</span>
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-voce-indigo" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const isActive = useIsActive();
  const router   = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    /* hidden on mobile, flex column on desktop */
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-[#E2E2E0] bg-white md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-voce-indigo">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2C5.79 2 4 3.79 4 6v4c0 2.21 1.79 4 4 4s4-1.79 4-4V6c0-2.21-1.79-4-4-4z"
                fill="white" fillOpacity="0.9" />
              <path d="M2 8.5C2 8.5 2 11 4 12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M14 8.5C14 8.5 14 11 12 12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#0F172A]">Voce</span>
        </Link>
      </div>

      <Separator />

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {DESKTOP_NAV.map(({ label, href, icon }) => (
            <li key={href}>
              <SidebarLink href={href} icon={icon} label={label} active={isActive(href)} />
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      {/* Bottom: settings + sign out */}
      <nav className="px-3 py-4">
        <ul className="space-y-0.5">
          <li>
            <SidebarLink href="/settings" icon={Settings} label="Settings" active={isActive("/settings")} />
          </li>
          <li>
            <button
              onClick={handleSignOut}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-[#94A3B8]" />
              Sign out
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

// ── Combined export used by layout ────────────────────────────────────────────

export function Navigation() {
  return (
    <>
      <BottomNav />
      <Sidebar />
    </>
  );
}
