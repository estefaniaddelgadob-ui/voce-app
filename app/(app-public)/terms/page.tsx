import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Echoooo",
  description: "Terms governing your use of Echoooo.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-[#0F172A]">Terms of Service</h1>
      <p className="mt-2 text-sm text-[#64748B]">Last updated: June 2026</p>

      <p className="mt-6 text-[#374151]">
        Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using Echoooo.
        By creating an account or using the service, you agree to be bound by these Terms.
      </p>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using Echoooo, you confirm that you are at least 13 years old, have read
          and understood these Terms, and agree to be bound by them. If you do not agree,
          please do not use Echoooo.
        </p>
      </Section>

      <Section title="2. Description of Service">
        <p>
          Echoooo is an AI-powered content creation platform that helps you develop your personal
          brand voice and generate social media content. The service includes voice recording and
          transcription, AI-powered content generation, and optional integration with Google Photos.
        </p>
      </Section>

      <Section title="3. Your Account">
        <p>
          You are responsible for maintaining the security of your account credentials and for
          all activity that occurs under your account. You must notify us immediately of any
          unauthorised use of your account.
        </p>
        <p>
          You must provide accurate and complete information when creating your account and keep
          it up to date.
        </p>
      </Section>

      <Section title="4. Your Content">
        <p>
          You retain ownership of all content you create or upload to Echoooo, including voice
          recordings, photos, written notes, and generated content. By using Echoooo, you grant us
          a limited, non-exclusive licence to process and store your content solely for the
          purpose of providing the service to you.
        </p>
        <p>
          You are responsible for ensuring that any content you provide does not infringe the
          rights of any third party or violate any applicable law.
        </p>
      </Section>

      <Section title="5. AI-Generated Content">
        <p>
          Echoooo uses AI to generate content suggestions based on your persona and inputs. You are
          solely responsible for reviewing, editing, and approving any AI-generated content before
          publishing it. We make no guarantees about the accuracy, originality, or suitability
          of AI-generated content.
        </p>
        <p>
          AI-generated content may occasionally produce output that is inaccurate, biased, or
          inappropriate. Always review content carefully before use.
        </p>
      </Section>

      <Section title="6. Acceptable Use">
        <p>You agree not to use Echoooo to:</p>
        <ul className="list-disc pl-6 space-y-1 text-[#374151]">
          <li>Generate content that is illegal, harmful, threatening, abusive, or harassing</li>
          <li>Infringe intellectual property rights of others</li>
          <li>Impersonate any person or entity</li>
          <li>Attempt to reverse-engineer, hack, or disrupt the service</li>
          <li>Use automated means to access the service without our permission</li>
          <li>Violate any applicable laws or regulations</li>
        </ul>
      </Section>

      <Section title="7. Google Photos Integration">
        <p>
          If you connect Google Photos, you authorise Echoooo to access your library on a read-only
          basis. You can revoke this access at any time from the Settings page. Your use of Google
          Photos through Echoooo is also subject to Google&apos;s Terms of Service and Privacy Policy.
        </p>
      </Section>

      <Section title="8. Privacy">
        <p>
          Your use of Echoooo is subject to our{" "}
          <a href="/privacy" className="text-[#6366F1] hover:underline">Privacy Policy</a>,
          which is incorporated into these Terms by reference.
        </p>
      </Section>

      <Section title="9. Service Availability">
        <p>
          We strive to keep Echoooo available and functioning, but we do not guarantee uninterrupted
          access. We may modify, suspend, or discontinue the service at any time with or without
          notice. We are not liable for any interruption or discontinuation of the service.
        </p>
      </Section>

      <Section title="10. Disclaimer of Warranties">
        <p>
          Echoooo is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
          either express or implied, including but not limited to implied warranties of merchantability,
          fitness for a particular purpose, or non-infringement. We do not warrant that the service
          will be error-free or that defects will be corrected.
        </p>
      </Section>

      <Section title="11. Limitation of Liability">
        <p>
          To the fullest extent permitted by law, Echoooo and its operators shall not be liable for
          any indirect, incidental, special, consequential, or punitive damages arising from your
          use of or inability to use the service, even if we have been advised of the possibility
          of such damages.
        </p>
      </Section>

      <Section title="12. Changes to Terms">
        <p>
          We may update these Terms from time to time. We will notify you of significant changes
          by updating the date at the top of this page. Continued use of Echoooo after changes
          constitutes your acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="13. Termination">
        <p>
          You may stop using Echoooo at any time. We reserve the right to suspend or terminate your
          account if you violate these Terms. Upon termination, your right to use the service
          ceases immediately.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          If you have any questions about these Terms, please contact us at:
        </p>
        <p className="mt-2">
          <a href="mailto:hello@echoooo.app" className="text-[#6366F1] hover:underline">
            hello@echoooo.app
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
