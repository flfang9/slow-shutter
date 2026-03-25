import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email } = await request.json();

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

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    // Log to Vercel (visible in deployment logs)
    console.log(`[WAITLIST] New signup: ${trimmedFirstName} ${trimmedLastName} <${trimmedEmail}> at ${new Date().toISOString()}`);

    // Send to Google Sheets via Apps Script webhook
    const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (sheetsWebhook) {
      try {
        await fetch(sheetsWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email: trimmedEmail,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (sheetError) {
        console.error('[WAITLIST] Google Sheets webhook failed:', sheetError);
      }
    }

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
            subject: `New Blurrr Waitlist Signup: ${trimmedFirstName} ${trimmedLastName}`,
            text: `New waitlist signup for Blurrr iOS app:\n\nName: ${trimmedFirstName} ${trimmedLastName}\nEmail: ${trimmedEmail}\nTime: ${new Date().toISOString()}`,
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
