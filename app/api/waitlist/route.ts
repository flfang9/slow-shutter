import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const DOWNSTREAM_TIMEOUT_MS = 5000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  return 'unknown';
}

function cleanupRateLimitStore(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const entry = rateLimitStore.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  rateLimitStore.set(ip, entry);
  return false;
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 12);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DOWNSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { firstName, lastName, email, website, consent } = await request.json();

    if (typeof website === 'string' && website.trim()) {
      return NextResponse.json({ success: true });
    }

    // Validate required fields
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      );
    }

    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json(
        { error: 'Last name is required' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (consent !== true) {
      return NextResponse.json(
        { error: 'Consent is required' },
        { status: 400 }
      );
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedFirstName.length > 80 || trimmedLastName.length > 80 || trimmedEmail.length > 254) {
      return NextResponse.json(
        { error: 'Input is too long' },
        { status: 400 }
      );
    }

    const emailHash = hashEmail(trimmedEmail);
    console.log(`[WAITLIST] Signup accepted: emailHash=${emailHash} ip=${clientIp} at ${new Date().toISOString()}`);

    // Send to Google Sheets via Apps Script webhook
    const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (sheetsWebhook) {
      try {
        const response = await fetchWithTimeout(sheetsWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email: trimmedEmail,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          console.error(`[WAITLIST] Google Sheets webhook failed with status ${response.status}`);
        }
      } catch (sheetError) {
        console.error('[WAITLIST] Google Sheets webhook failed:', sheetError);
      }
    }

    // If Resend API key is available, send notification email
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const response = await fetchWithTimeout('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Blurrr Waitlist <onboarding@resend.dev>',
            to: 'ffangcreative@gmail.com',
            subject: `New Blurrr Waitlist Signup: ${trimmedFirstName} ${trimmedLastName}`,
            text: `New waitlist signup for Blurrr iOS app:\n\nName: ${trimmedFirstName} ${trimmedLastName}\nEmail: ${trimmedEmail}\nTime: ${new Date().toISOString()}`,
          }),
        });

        if (!response.ok) {
          console.error(`[WAITLIST] Resend notification failed with status ${response.status}`);
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('[WAITLIST] Email notification failed:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    console.error('[WAITLIST] Error processing request');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
