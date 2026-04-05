import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support - Blurrr',
  description: 'Get help with Blurrr',
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-white/50 hover:text-white text-sm mb-8 inline-block transition-colors">
          &larr; Back
        </Link>

        <h1 className="text-4xl font-bold mb-2">Support</h1>
        <p className="text-white/50 mb-12">We&apos;re here to help</p>

        <div className="space-y-10 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-4">Contact Us</h2>
            <p className="text-white/50">
              Have a question, issue, or feedback? Reach out and we&apos;ll get back to you as quick as we can.
            </p>
            <div className="mt-4 p-4 bg-[#080808] rounded-lg border border-white/10">
              <p className="text-sm"><strong className="text-white">Email:</strong> <a href="mailto:ffangcreative@gmail.com" className="text-white hover:underline">ffangcreative@gmail.com</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">How do I restore my purchase?</h3>
                <p className="text-white/50 text-sm">
                  Open Blurrr, go to Settings (gear icon), and tap &quot;Restore Purchases&quot;. Make sure you&apos;re signed into the same Apple ID you used to purchase.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">How do I cancel my subscription?</h3>
                <p className="text-white/50 text-sm">
                  Subscriptions are managed through Apple. Go to iPhone Settings → [Your Name] → Subscriptions → Blurrr → Cancel Subscription. You&apos;ll retain access until the end of your billing period.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Why can&apos;t I save or share my photos?</h3>
                <p className="text-white/50 text-sm">
                  Saving and sharing require an active subscription or lifetime purchase. You can still capture and preview effects for free.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Where are my photos saved?</h3>
                <p className="text-white/50 text-sm">
                  Photos are saved to the Blurrr gallery within the app. If you grant Photos access, they&apos;re also saved to a &quot;Blurrr&quot; album in your iPhone Photos app.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Why is my phone getting warm?</h3>
                <p className="text-white/50 text-sm">
                  Blurrr uses your phone&apos;s GPU to process effects in real-time. Some warmth during extended use is normal and expected.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">How do I move the blur center point?</h3>
                <p className="text-white/50 text-sm">
                  For Zoom, Swirl, and Vortex effects, simply tap anywhere on the image to reposition the center of the blur.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Can I edit photos from my camera roll?</h3>
                <p className="text-white/50 text-sm">
                  Yes! Tap the photo library icon in the camera view or gallery to import any photo from your camera roll.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Troubleshooting</h2>

            <div className="space-y-4 text-white/50 text-sm">
              <div className="p-4 bg-[#080808] rounded-lg border border-white/10">
                <p><strong className="text-white">App crashes on launch:</strong> Try force-quitting and reopening. If the issue persists, delete and reinstall the app (your subscription will restore automatically).</p>
              </div>
              <div className="p-4 bg-[#080808] rounded-lg border border-white/10">
                <p><strong className="text-white">Effects not loading:</strong> Ensure you have enough storage space. Blurrr requires at least 100MB free to process images.</p>
              </div>
              <div className="p-4 bg-[#080808] rounded-lg border border-white/10">
                <p><strong className="text-white">&quot;Limited Photos Access&quot; error:</strong> Go to iPhone Settings → Privacy → Photos → Blurrr and select &quot;Full Access&quot; to save photos to your library.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Request a Refund</h2>
            <p className="text-white/50">
              Refunds are handled by Apple. Visit <a href="https://reportaproblem.apple.com" className="text-white hover:underline" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a>, sign in with your Apple ID, find your Blurrr purchase, and request a refund.
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
