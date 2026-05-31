export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#64748B]">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Total Recordings", value: "0", color: "#7F77DD" },
          { label: "Published Content", value: "0", color: "#1D9E75" },
          { label: "Scheduled Posts", value: "0", color: "#7F77DD" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#E2E2E0] bg-white p-6"
          >
            <p className="text-sm font-medium text-[#64748B]">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-[#E2E2E0] bg-white p-6">
        <h2 className="text-base font-semibold text-[#0F172A]">Recent Activity</h2>
        <p className="mt-4 text-sm text-[#94A3B8]">No activity yet. Start by recording your first voice note.</p>
      </div>
    </div>
  );
}
