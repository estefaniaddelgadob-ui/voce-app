export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Settings</h1>
        <p className="mt-1 text-sm text-[#64748B]">Manage your account and preferences.</p>
      </div>

      <div className="space-y-6">
        {[
          {
            section: "Account",
            items: [
              { label: "Display Name", value: "Your Name", type: "text" },
              { label: "Email", value: "you@example.com", type: "email" },
            ],
          },
          {
            section: "Integrations",
            items: [
              { label: "LinkedIn", value: "Not connected", type: "connect" },
              { label: "Twitter / X", value: "Not connected", type: "connect" },
            ],
          },
        ].map((group) => (
          <div key={group.section} className="rounded-xl border border-[#E2E2E0] bg-white">
            <div className="border-b border-[#E2E2E0] px-6 py-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">{group.section}</h2>
            </div>
            <div className="divide-y divide-[#E2E2E0]">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                    <p className="text-xs text-[#94A3B8]">{item.value}</p>
                  </div>
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      item.type === "connect"
                        ? "bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/20"
                        : "border border-[#E2E2E0] text-[#64748B] hover:bg-[#F4F4F2]"
                    }`}
                  >
                    {item.type === "connect" ? "Connect" : "Edit"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
