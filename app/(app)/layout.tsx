import Link from "next/link";
import { Settings } from "lucide-react";
import { Navigation } from "@/components/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navigation />

      {/*
        Mobile:  pb-24 clears the 64px bottom nav + iOS home indicator
        Desktop: md:ml-60 offsets the 240px sidebar; md:pb-0 removes bottom gap
      */}
      <main className="pb-24 md:ml-60 md:pb-0">
        <div className="relative mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          {/* Settings gear — top-right of every page, mobile only.
              Desktop users reach Settings via the sidebar link. */}
          <Link
            href="/settings"
            aria-label="Settings"
            className="absolute right-4 top-6 z-10 rounded-full p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F4F4F2] hover:text-[#0F172A] md:hidden"
          >
            <Settings className="h-5 w-5" />
          </Link>

          {children}
        </div>
      </main>
    </div>
  );
}
