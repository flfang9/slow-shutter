import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Validate email
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

    // Log to Vercel (visible in deployment logs)
    console.log(`[WAITLIST] New signup: ${email} at ${new Date().toISOString()}`);

    // If Resend API key is available, send notification email
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Blurrr Waitlist <onboarding@resend.dev>',
            to: 'ffangcreative@gmail.com',
            subject: `New Blurrr Waitlist Signup: ${email}`,
            text: `New waitlist signup for Blurrr iOS app:\n\nEmail: ${email}\nTime: ${new Date().toISOString()}`,
          }),
        });
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
