export default function SchedulePage() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Schedule</h1>
          <p className="mt-1 text-sm text-[#64748B]">Plan and schedule your content.</p>
        </div>
        <button className="rounded-lg bg-[#7F77DD] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
          Schedule Post
        </button>
      </div>

      <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F172A]">{month}</h2>
          <div className="flex gap-2">
            <button className="rounded-lg border border-[#E2E2E0] px-3 py-1.5 text-sm text-[#64748B] hover:bg-[#F4F4F2]">
              ‹
            </button>
            <button className="rounded-lg border border-[#E2E2E0] px-3 py-1.5 text-sm text-[#64748B] hover:bg-[#F4F4F2]">
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-[#94A3B8]">
              {d}
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg p-1 text-center text-sm text-[#64748B] hover:bg-[#F4F4F2]"
            >
              <span className={i === 15 ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#7F77DD] text-white mx-auto" : ""}>
                {i + 1 <= 31 ? i + 1 : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
