import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Resend client (lazy singleton)
// ---------------------------------------------------------------------------

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set – skipping email');
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_ADDRESS = 'YoeltheG <onboarding@resend.dev>';
const PLATFORM_NAME = 'YoeltheG';
const LOGIN_URL = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin`
  : 'http://localhost:3000/admin';

// ---------------------------------------------------------------------------
// HTML wrapper
// ---------------------------------------------------------------------------

function wrapHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#7c3aed;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;">${PLATFORM_NAME}</h1>
    </div>
    <div style="padding:32px;">
      ${bodyContent}
    </div>
    <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">&copy; ${new Date().getFullYear()} ${PLATFORM_NAME}. Built with love by the family.</p>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Fire-and-forget sender
// ---------------------------------------------------------------------------

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
    }
  } catch (err) {
    console.error(`[email] Exception sending "${subject}" to ${to}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Email functions
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(
  to: string,
  displayName: string,
  role: string,
  tempPassword: string,
): Promise<void> {
  const roleLabel = role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const html = wrapHtml('Welcome to YoeltheG!', `
    <h2 style="margin:0 0 16px;color:#18181b;">Welcome, ${displayName}!</h2>
    <p style="color:#3f3f46;line-height:1.6;">
      Your account has been created on <strong>${PLATFORM_NAME}</strong>.
    </p>
    <table style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 16px 4px 0;color:#71717a;font-size:14px;">Email:</td><td style="color:#18181b;font-size:14px;">${to}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#71717a;font-size:14px;">Temporary Password:</td><td style="color:#18181b;font-size:14px;font-family:monospace;background:#f4f4f5;padding:2px 8px;border-radius:4px;">${tempPassword}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#71717a;font-size:14px;">Role:</td><td style="color:#18181b;font-size:14px;">${roleLabel}</td></tr>
    </table>
    <p style="color:#3f3f46;line-height:1.6;">
      You will be asked to change your password on first login.
    </p>
    <a href="${LOGIN_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
      Log In Now
    </a>
  `);

  await sendEmail(to, `Welcome to ${PLATFORM_NAME}!`, html);
}

export async function sendPasswordResetEmail(
  to: string,
  displayName: string,
  tempPassword: string,
): Promise<void> {
  const html = wrapHtml('Password Reset', `
    <h2 style="margin:0 0 16px;color:#18181b;">Password Reset</h2>
    <p style="color:#3f3f46;line-height:1.6;">
      Hi ${displayName}, your password has been reset by an administrator.
    </p>
    <table style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 16px 4px 0;color:#71717a;font-size:14px;">New Temporary Password:</td><td style="color:#18181b;font-size:14px;font-family:monospace;background:#f4f4f5;padding:2px 8px;border-radius:4px;">${tempPassword}</td></tr>
    </table>
    <p style="color:#3f3f46;line-height:1.6;">
      Please log in and change your password immediately.
    </p>
    <a href="${LOGIN_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
      Log In &amp; Change Password
    </a>
  `);

  await sendEmail(to, `${PLATFORM_NAME} - Your password has been reset`, html);
}

export async function sendPasswordChangedEmail(
  to: string,
  displayName: string,
): Promise<void> {
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const html = wrapHtml('Password Changed', `
    <h2 style="margin:0 0 16px;color:#18181b;">Password Changed Successfully</h2>
    <p style="color:#3f3f46;line-height:1.6;">
      Hi ${displayName}, your password was changed on <strong>${timestamp}</strong>.
    </p>
    <p style="color:#3f3f46;line-height:1.6;">
      If you did not make this change, please contact an administrator immediately.
    </p>
  `);

  await sendEmail(to, `${PLATFORM_NAME} - Password changed`, html);
}

export async function sendRoleUpdatedEmail(
  to: string,
  displayName: string,
  newRole: string,
): Promise<void> {
  const roleLabel = newRole.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const permissionsMap: Record<string, string> = {
    super_admin: 'Full platform access: manage users, publish/unpublish games, manage developers, and all admin functions.',
    admin: 'Admin access: manage developers, upload and edit games. Cannot publish games or manage users.',
    family_dev: 'Family developer access: upload and edit your own games. Exempt from fees.',
    outside_dev: 'Developer access: upload and edit your own games. Subject to platform fees.',
  };

  const permissions = permissionsMap[newRole] || 'Standard access.';

  const html = wrapHtml('Role Updated', `
    <h2 style="margin:0 0 16px;color:#18181b;">Your Role Has Been Updated</h2>
    <p style="color:#3f3f46;line-height:1.6;">
      Hi ${displayName}, your role on <strong>${PLATFORM_NAME}</strong> has been changed to:
    </p>
    <div style="margin:16px 0;padding:12px 16px;background:#f4f4f5;border-radius:8px;border-left:4px solid #7c3aed;">
      <strong style="color:#18181b;font-size:16px;">${roleLabel}</strong>
    </div>
    <p style="color:#3f3f46;line-height:1.6;font-size:14px;">
      <strong>Permissions:</strong> ${permissions}
    </p>
  `);

  await sendEmail(to, `${PLATFORM_NAME} - Your role has been updated to ${roleLabel}`, html);
}

export async function sendGamePublishedEmail(
  to: string,
  displayName: string,
  gameTitle: string,
  gameUrl: string,
): Promise<void> {
  const html = wrapHtml('Game Published!', `
    <h2 style="margin:0 0 16px;color:#18181b;">Your Game is Live!</h2>
    <p style="color:#3f3f46;line-height:1.6;">
      Congratulations ${displayName}! Your game <strong>${gameTitle}</strong> has been published on ${PLATFORM_NAME}.
    </p>
    <a href="${gameUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#22c55e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
      View Your Game
    </a>
  `);

  await sendEmail(to, `${PLATFORM_NAME} - "${gameTitle}" is now live!`, html);
}

export async function sendGameUnpublishedEmail(
  to: string,
  displayName: string,
  gameTitle: string,
): Promise<void> {
  const html = wrapHtml('Game Unpublished', `
    <h2 style="margin:0 0 16px;color:#18181b;">Game Unpublished</h2>
    <p style="color:#3f3f46;line-height:1.6;">
      Hi ${displayName}, your game <strong>${gameTitle}</strong> has been unpublished from ${PLATFORM_NAME}.
    </p>
    <p style="color:#3f3f46;line-height:1.6;">
      If you have questions about this, please contact an administrator.
    </p>
  `);

  await sendEmail(to, `${PLATFORM_NAME} - "${gameTitle}" has been unpublished`, html);
}

export async function sendDeveloperApprovedEmail(
  to: string,
  displayName: string,
): Promise<void> {
  const html = wrapHtml('Developer Approved!', `
    <h2 style="margin:0 0 16px;color:#18181b;">You've Been Approved!</h2>
    <p style="color:#3f3f46;line-height:1.6;">
      Congratulations ${displayName}! Your developer account on <strong>${PLATFORM_NAME}</strong> has been approved.
    </p>
    <p style="color:#3f3f46;line-height:1.6;">
      You can now submit games for publishing.
    </p>
    <a href="${LOGIN_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
      Get Started
    </a>
  `);

  await sendEmail(to, `${PLATFORM_NAME} - Your developer account is approved!`, html);
}
