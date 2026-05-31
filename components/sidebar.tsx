"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  UserCircle,
  FilePlus,
  Library,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Record", href: "/record", icon: Mic },
  { label: "My Persona", href: "/my-persona", icon: UserCircle },
  { label: "Content", href: "/content/new", icon: FilePlus },
  { label: "Library", href: "/library", icon: Library },
  { label: "Schedule", href: "/content/calendar", icon: CalendarDays },
];

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-[#7F77DD]/10 text-[#7F77DD]"
          : "text-[#64748B] hover:bg-[#F4F4F2] hover:text-[#0F172A]"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-[#7F77DD]" : "text-[#94A3B8]"
        )}
      />
      <span className="truncate">{label}</span>
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#7F77DD]" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/content/new") return pathname.startsWith("/content/new");
    if (href === "/content/calendar") return pathname.startsWith("/content/calendar");
    return pathname === href || pathname.startsWith(href + "/");
  };

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#E2E2E0] bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7F77DD]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2C5.79 2 4 3.79 4 6v4c0 2.21 1.79 4 4 4s4-1.79 4-4V6c0-2.21-1.79-4-4-4z"
                fill="white"
                fillOpacity="0.9"
              />
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
          {navItems.map((item) => (
            <li key={item.href}>
              <NavItem
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={isActive(item.href)}
              />
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      {/* Bottom nav */}
      <nav className="px-3 py-4">
        <ul className="space-y-0.5">
          <li>
            <NavItem
              href="/settings"
              icon={Settings}
              label="Settings"
              active={isActive("/settings")}
            />
          </li>
          <li>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#64748B] transition-all hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-[#94A3B8]" />
              <span>Sign out</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
