import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Blurrr',
  description: 'Terms of Service for the Blurrr app',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-white/50 hover:text-white text-sm mb-8 inline-block transition-colors">
          &larr; Back
        </Link>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-white/50 mb-12">Last updated: March 17, 2025</p>

        <div className="space-y-10 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-4">Agreement</h2>
            <p className="text-white/50">
              By using Blurrr, you agree to these Terms. The app is developed by Freddy Fang.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Use of the App</h2>
            <p className="text-white/50 mb-3">You may use the app for personal, non-commercial purposes. You agree not to:</p>
            <ul className="space-y-1 text-white/50 text-sm">
              <li>• Use the app for illegal purposes</li>
              <li>• Reverse engineer or decompile the app</li>
              <li>• Process content you don&apos;t have rights to</li>
              <li>• Distribute or sublicense the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Subscriptions</h2>

            <h3 className="font-medium mt-6 mb-3">Free Trial</h3>
            <p className="text-white/50">
              We may offer a free trial with full premium access. After expiration, a subscription is required for premium features.
            </p>

            <h3 className="font-medium mt-6 mb-3">Billing</h3>
            <p className="text-white/50">
              Subscriptions are billed through Apple&apos;s App Store. They auto-renew unless canceled 24+ hours before the period ends. Manage subscriptions in your Apple ID settings.
            </p>

            <h3 className="font-medium mt-6 mb-3">Refunds</h3>
            <p className="text-white/50">
              All purchases are processed by Apple. Request refunds through Apple&apos;s refund process.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Intellectual Property</h2>
            <p className="text-white/50">
              The app and its content are owned by Freddy Fang and protected by copyright. You retain all rights to photos you process.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Disclaimer</h2>
            <p className="text-white/50 text-sm">
              THE APP IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DON&apos;T WARRANT THAT THE APP WILL BE ERROR-FREE OR MEET YOUR SPECIFIC REQUIREMENTS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-white/50 text-sm">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, FREDDY FANG SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. TOTAL LIABILITY SHALL NOT EXCEED AMOUNTS PAID IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Termination</h2>
            <p className="text-white/50">
              We may terminate access for Terms violations. Upon termination, your right to use the app ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Governing Law</h2>
            <p className="text-white/50">
              These Terms are governed by United States law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Changes</h2>
            <p className="text-white/50">
              We may modify these Terms. Continued use after changes constitutes acceptance.
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
