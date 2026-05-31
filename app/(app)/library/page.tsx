export default function LibraryPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Library</h1>
          <p className="mt-1 text-sm text-[#64748B]">All your recordings and generated content.</p>
        </div>
        <button className="rounded-lg bg-[#7F77DD] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
          New Recording
        </button>
      </div>

      <div className="rounded-xl border border-[#E2E2E0] bg-white">
        <div className="border-b border-[#E2E2E0] px-6 py-4">
          <div className="flex gap-4 text-sm">
            {["All", "Recordings", "Generated", "Published"].map((tab) => (
              <button
                key={tab}
                className={`pb-1 font-medium transition-colors ${
                  tab === "All"
                    ? "border-b-2 border-[#7F77DD] text-[#7F77DD]"
                    : "text-[#94A3B8] hover:text-[#0F172A]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-[#94A3B8]">No items yet. Record something to get started.</p>
        </div>
      </div>
    </div>
  );
}
