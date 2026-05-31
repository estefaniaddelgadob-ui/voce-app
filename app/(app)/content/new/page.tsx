export default function NewContentPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">New Content</h1>
        <p className="mt-1 text-sm text-[#64748B]">Create content from your recordings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "LinkedIn Post", desc: "Professional thought leadership", accent: "#7F77DD" },
          { title: "Twitter Thread", desc: "Bite-sized insights for your audience", accent: "#7F77DD" },
          { title: "Newsletter", desc: "Long-form content for subscribers", accent: "#1D9E75" },
          { title: "Blog Article", desc: "SEO-optimized written content", accent: "#1D9E75" },
          { title: "Instagram Caption", desc: "Engaging captions with hashtags", accent: "#7F77DD" },
          { title: "YouTube Script", desc: "Structured video scripts", accent: "#1D9E75" },
        ].map((type) => (
          <button
            key={type.title}
            className="group rounded-xl border border-[#E2E2E0] bg-white p-6 text-left transition-all hover:border-[#7F77DD] hover:shadow-sm"
          >
            <div
              className="mb-3 h-2 w-8 rounded-full"
              style={{ backgroundColor: type.accent }}
            />
            <h3 className="font-semibold text-[#0F172A]">{type.title}</h3>
            <p className="mt-1 text-sm text-[#94A3B8]">{type.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
