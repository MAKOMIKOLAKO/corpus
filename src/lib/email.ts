import 'server-only';

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function getResendClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Email sending is server-only');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { Resend } = await import('resend');
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name: string
) {
  const resetUrl = `${APP_URL}/reset-password/${token}`;
  const resend = await getResendClient();

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Corpus password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;
                  background: #0a0a0a; color: #ffffff; padding: 40px;
                  border-radius: 8px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Reset your password</h1>
        <p style="color: #9ca3af; margin-bottom: 32px;">
          Hi ${name || 'there'}, we received a request to reset your
          Corpus password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #6366f1; color: #ffffff;
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;
                  font-weight: 600;">
          Reset Password
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
          This link expires in 1 hour. If you didn't request a password
          reset, you can safely ignore this email.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
) {
  const verifyUrl = `${APP_URL}/verify-email/${token}`;
  const resend = await getResendClient();

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your Corpus email',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;
                  background: #0a0a0a; color: #ffffff; padding: 40px;
                  border-radius: 8px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Verify your email</h1>
        <p style="color: #9ca3af; margin-bottom: 32px;">
          Hi ${name || 'there'}, thanks for joining Corpus. Click below
          to verify your email address and activate your account.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #6366f1; color: #ffffff;
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;
                  font-weight: 600;">
          Verify Email
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
          This link expires in 24 hours.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy this link: ${verifyUrl}
        </p>
      </div>
    `,
  });
}
