'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';

export function WaitlistForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      setStatus('error');
      setErrorMessage('First name is required');
      return;
    }

    if (!lastName.trim()) {
      setStatus('error');
      setErrorMessage('Last name is required');
      return;
    }

    if (!email || !email.includes('@')) {
      setStatus('error');
      setErrorMessage('Please enter a valid email');
      return;
    }

    if (!consent) {
      setStatus('error');
      setErrorMessage('Please agree to be contacted about Blurrr updates');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          website: website.trim(),
          consent,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setFirstName('');
        setLastName('');
        setEmail('');
        setWebsite('');
        setConsent(false);
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
      <div className="py-2">
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
    <div>
      <p className="text-sm text-white/60 mb-4">
        Get notified when we launch.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:gap-2">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
            disabled={status === 'loading'}
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
            disabled={status === 'loading'}
          />
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
          disabled={status === 'loading'}
        />

        <label className="flex items-start gap-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={status === 'loading'}
            className="mt-0.5 h-4 w-4 rounded border border-white/20 bg-white/5 accent-white"
          />
          <span>
            I agree to be contacted about Blurrr updates and launch news.
          </span>
        </label>

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
