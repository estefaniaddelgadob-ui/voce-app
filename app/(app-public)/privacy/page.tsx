import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Voce",
  description: "How Voce collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-[#0F172A]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#64748B]">Last updated: June 2026</p>

      <p className="mt-6 text-[#374151]">
        Voce (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy.
        This policy explains what information we collect, how we use it, and what choices you have.
      </p>

      <Section title="1. Who We Are">
        <p>
          Voce is a personal brand and content creation platform that helps creators develop their
          authentic voice and generate social media content using AI. We never sell your data or
          use it for advertising.
        </p>
      </Section>

      <Section title="2. What We Collect">
        <Subsection title="Voice recordings">
          <p>
            When you record a voice note, the audio is sent to OpenAI Whisper for transcription.
            The audio file is processed in memory and is <strong>never stored permanently</strong> — only the
            text transcript is saved to your account. Recordings are deleted immediately after transcription.
          </p>
        </Subsection>
        <Subsection title="Photos and media">
          <p>
            If you connect Google Photos, we access your library on a read-only basis to suggest
            matching media for your content. We store only the <strong>URL and metadata</strong> (date taken,
            media type) of each item — never the photo or video file itself. We do not modify,
            delete, or upload anything to your Google Photos library.
          </p>
          <p>
            If you upload a photo of handwritten notes, the image is processed by Claude AI for
            text extraction and is <strong>not stored</strong> after analysis is complete.
          </p>
        </Subsection>
        <Subsection title="Profile and persona information">
          <p>
            We store the information you provide to build your persona: your Instagram handle,
            niche, audience description, tone preferences, values, and writing samples. This
            information is used exclusively to personalise AI-generated content for you.
          </p>
        </Subsection>
        <Subsection title="Content drafts">
          <p>
            Generated content, your edits, and approval decisions are stored in your account so
            you can access them across sessions.
          </p>
        </Subsection>
        <Subsection title="Account information">
          <p>
            We store your email address (provided at sign-up via Supabase Auth) to identify your
            account. We do not store passwords directly — authentication is handled securely by Supabase.
          </p>
        </Subsection>
      </Section>

      <Section title="3. How We Use Your Data">
        <ul className="list-disc pl-6 space-y-1 text-[#374151]">
          <li>To generate personalised content in your voice using Claude AI (Anthropic)</li>
          <li>To transcribe voice notes using Whisper (OpenAI)</li>
          <li>To suggest relevant photos from your Google Photos library</li>
          <li>To maintain your persona profile and content library across sessions</li>
          <li>To improve your experience within the app</li>
        </ul>
        <p className="mt-4">
          We do <strong>not</strong> use your data to train AI models, sell to third parties,
          display advertising, or share with any party not listed in this policy.
        </p>
      </Section>

      <Section title="4. Third-Party Services">
        <p>We use the following third-party services to operate Voce:</p>
        <ul className="list-disc pl-6 space-y-1 text-[#374151]">
          <li><strong>Supabase</strong> — database and authentication (supabase.com)</li>
          <li><strong>Anthropic (Claude)</strong> — AI content generation and analysis</li>
          <li><strong>OpenAI (Whisper)</strong> — voice transcription</li>
          <li><strong>Google Photos API</strong> — read-only media library access (when connected)</li>
          <li><strong>Vercel</strong> — hosting and infrastructure</li>
        </ul>
        <p className="mt-4">
          Each of these services has its own privacy policy and data processing terms.
          Your data is shared with them only to the extent necessary to provide Voce&apos;s functionality.
        </p>
      </Section>

      <Section title="5. Google Photos Integration">
        <p>
          When you connect Google Photos, Voce requests read-only access
          (<code>photoslibrary.readonly</code>) to your Google Photos library. This means we can:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-[#374151]">
          <li>View the list of your photos and videos</li>
          <li>Read metadata (date taken, media type)</li>
          <li>Display photo thumbnails within the app</li>
        </ul>
        <p className="mt-4">
          We <strong>cannot and do not</strong> upload, modify, delete, or share any content in
          your Google Photos library. You can disconnect Google Photos at any time from the
          Settings page, which immediately revokes our access.
        </p>
      </Section>

      <Section title="6. Data Retention and Deletion">
        <p>
          You can delete your data at any time. From the Settings page, you can disconnect
          integrations and request account deletion. When you delete your account, all data
          associated with it — including your persona profile, voice note transcripts, content
          drafts, and media metadata — is permanently deleted.
        </p>
        <p>
          Voice audio files are never retained beyond the transcription request (typically a few seconds).
        </p>
      </Section>

      <Section title="7. Data Security">
        <p>
          All data is stored in Supabase with row-level security enabled, meaning each user can
          only access their own data. All communication between your device and our servers is
          encrypted using HTTPS/TLS. OAuth tokens for Google Photos are stored encrypted and are
          used only to make requests on your behalf.
        </p>
      </Section>

      <Section title="8. Your Rights">
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc pl-6 space-y-1 text-[#374151]">
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to or restrict certain processing</li>
          <li>Export your data in a portable format</li>
        </ul>
        <p className="mt-4">To exercise any of these rights, contact us at the email below.</p>
      </Section>

      <Section title="9. Children's Privacy">
        <p>
          Voce is not directed at children under 13 years of age. We do not knowingly collect
          personal information from children under 13.
        </p>
      </Section>

      <Section title="10. Changes to This Policy">
        <p>
          We may update this privacy policy from time to time. When we do, we will update the
          date at the top of this page. Continued use of Voce after changes constitutes
          acceptance of the updated policy.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          If you have any questions about this privacy policy or how we handle your data,
          please contact us at:
        </p>
        <p className="mt-2">
          <a href="mailto:privacy@voce.app" className="text-[#6366F1] hover:underline">
            privacy@voce.app
          </a>
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-[#0F172A]">{title}</h2>
      <div className="mt-3 space-y-3 text-[#374151] leading-relaxed">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
      <div className="mt-1 space-y-2">{children}</div>
    </div>
  );
}
