import { Navigation } from "@/components/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navigation />

      {/*
        Mobile:  pb-24 = 96px clears the 64px bottom nav + iOS home indicator
        Desktop: md:ml-60 shifts content right of the sidebar, md:pb-0 removes bottom gap
      */}
      <main className="pb-24 md:ml-60 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
