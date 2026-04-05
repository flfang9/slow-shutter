'use client';

import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

const STORAGE_KEY = 'blurrr_web_access';

interface EmailGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmailGateModal({ isOpen, onClose, onSuccess }: EmailGateModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
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
        // Save to localStorage so they don't see this again
        localStorage.setItem(STORAGE_KEY, 'true');
        onSuccess();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/70 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.jpg" alt="Blurrr" className="w-12 h-12 rounded-xl" />
            <div>
              <h2 className="text-xl font-semibold text-white">Join the Blurrr Waitlist</h2>
              <p className="text-sm text-white/50">Get early access to the iOS app</p>
            </div>
          </div>

          {/* Value prop */}
          <p className="text-sm text-white/60 mb-6">
            Sign up for the iOS waitlist and get <span className="text-white font-medium">unlimited access</span> to the web editor right now.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot */}
            <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="gate-website">Website</label>
              <input
                id="gate-website"
                name="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                disabled={status === 'loading'}
                autoFocus
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
                'Join Waitlist & Start Editing'
              )}
            </button>

            {status === 'error' && (
              <p className="text-xs text-red-400">{errorMessage}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export function hasWebAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}
