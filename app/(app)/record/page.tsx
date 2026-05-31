export default function RecordPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Record</h1>
        <p className="mt-1 text-sm text-[#64748B]">Capture your voice. We&apos;ll handle the rest.</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E2E0] bg-white px-8 py-20">
        <button className="flex h-20 w-20 items-center justify-center rounded-full bg-[#7F77DD] shadow-lg transition-transform hover:scale-105 active:scale-95">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C10.34 2 9 3.34 9 5v6c0 1.66 1.34 3 3 3s3-1.34 3-3V5c0-1.66-1.34-3-3-3z"
              fill="white"
            />
            <path
              d="M5 10.5C5 14.09 7.91 17 11.5 17h1C16.09 17 19 14.09 19 10.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M12 17v4M8 21h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <p className="mt-6 text-sm font-medium text-[#64748B]">Click to start recording</p>
      </div>
    </div>
  );
}
