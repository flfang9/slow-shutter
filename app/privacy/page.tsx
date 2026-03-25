import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Blurrr',
  description: 'Privacy Policy for the Blurrr app',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-white/50 hover:text-white text-sm mb-8 inline-block transition-colors">
          &larr; Back
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-white/50 mb-12">Last updated: March 17, 2025</p>

        <div className="space-y-10 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <p className="text-white/50">
              Blurrr is developed by Freddy Fang. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.
            </p>
            <div className="mt-4 p-4 bg-[#080808] rounded-lg border border-white/10">
              <p className="text-sm"><strong className="text-white">The short version:</strong> <span className="text-white/50">Your photos are processed entirely on your device and are never uploaded to our servers.</span></p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">What We Don&apos;t Collect</h2>
            <ul className="space-y-2 text-white/50">
              <li><strong className="text-white">Photos:</strong> All processing happens locally. Your photos never leave your device.</li>
              <li><strong className="text-white">Accounts:</strong> No account required to use the app.</li>
              <li><strong className="text-white">Location:</strong> We don&apos;t collect location data.</li>
              <li><strong className="text-white">Contacts:</strong> We don&apos;t access your contacts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">What We Collect</h2>

            <h3 className="font-medium mt-6 mb-3">Purchase Information</h3>
            <p className="text-white/50">
              When you subscribe, we use Adapty to process transactions through Apple&apos;s App Store. This includes transaction IDs, subscription status, and a device identifier for purchase restoration. We never see your payment details.
            </p>

            <h3 className="font-medium mt-6 mb-3">Crash Reports</h3>
            <p className="text-white/50">
              We use Sentry to collect crash reports and diagnostics: device type, OS version, app version, and error logs. This data is anonymized and contains no personal information or photos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Data Sharing</h2>
            <p className="text-white/50">We don&apos;t sell your data. We share anonymized data with:</p>
            <ul className="mt-2 space-y-1 text-white/50 text-sm">
              <li>• <strong className="text-white">Adapty</strong> for subscription management</li>
              <li>• <strong className="text-white">Sentry</strong> for crash reporting</li>
              <li>• <strong className="text-white">Apple</strong> for App Store transactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Your Rights</h2>
            <p className="text-white/50">
              You may request access, correction, or deletion of your data. Contact us at <a href="mailto:ffangcreative@gmail.com" className="text-white hover:underline">ffangcreative@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Children&apos;s Privacy</h2>
            <p className="text-white/50">
              The app is not directed to children under 13. We don&apos;t knowingly collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Changes</h2>
            <p className="text-white/50">
              We may update this policy. Changes will be posted here with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Contact</h2>
            <p className="text-white/50">
              Questions? Email <a href="mailto:ffangcreative@gmail.com" className="text-white hover:underline">ffangcreative@gmail.com</a>
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center text-sm text-white/30">
          <Link href="/" className="hover:text-white transition-colors">Blurrr</Link> &copy; 2025 Freddy Fang
        </div>
      </div>
    </main>
  );
}
