'use client';

import { useState } from 'react';
import { Smartphone, Loader2, Check } from 'lucide-react';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setErrorMessage('Please enter a valid email');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        const data = await res.json();
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 text-emerald-400">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">You&apos;re on the list!</span>
        </div>
        <p className="text-xs text-white/40 mt-2">
          We&apos;ll notify you when Blurrr launches on iOS.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-4 h-4 text-white/50" />
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Coming to iOS
        </span>
      </div>

      <p className="text-sm text-white/60 mb-4">
        Get notified when Blurrr launches on the App Store.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
          disabled={status === 'loading'}
        />

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-4 py-3 bg-white text-black text-sm font-medium rounded-lg transition-all hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Joining...
            </>
          ) : (
            'Join Waitlist'
          )}
        </button>

        {status === 'error' && (
          <p className="text-xs text-red-400">{errorMessage}</p>
        )}
      </form>
    </div>
  );
}
