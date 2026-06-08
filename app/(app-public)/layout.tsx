import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#E2E2E0]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6366F1]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C5.79 2 4 3.79 4 6v4c0 2.21 1.79 4 4 4s4-1.79 4-4V6c0-2.21-1.79-4-4-4z"
                  fill="white" fillOpacity="0.9" />
                <path d="M2 8.5C2 8.5 2 11 4 12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 8.5C14 8.5 14 11 12 12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-[#0F172A]">Echoooo</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-[#64748B]">
            <Link href="/privacy" className="hover:text-[#0F172A] transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-[#0F172A] transition-colors">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-[#E2E2E0] py-8 text-center text-xs text-[#94A3B8]">
        © {new Date().getFullYear()} Voce. All rights reserved.
      </footer>
    </div>
  );
}
