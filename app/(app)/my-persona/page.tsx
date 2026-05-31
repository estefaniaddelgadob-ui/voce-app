export default function MyPersonaPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">My Persona</h1>
        <p className="mt-1 text-sm text-[#64748B]">Define your voice and content style.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
          <h2 className="text-base font-semibold text-[#0F172A]">Voice Profile</h2>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Train your AI persona by recording samples and setting preferences.
          </p>
          <button className="mt-4 rounded-lg bg-[#7F77DD] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
            Set Up Voice
          </button>
        </div>

        <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
          <h2 className="text-base font-semibold text-[#0F172A]">Content Style</h2>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Choose your tone, platforms, and content format preferences.
          </p>
          <button className="mt-4 rounded-lg border border-[#E2E2E0] px-4 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F4F4F2]">
            Configure Style
          </button>
        </div>
      </div>
    </div>
  );
}
