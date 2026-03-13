import { NextRequest, NextResponse } from 'next/server';
import {
  validatePassword,
  setAdminCookie,
  isAdminAuthenticated,
  clearAdminCookie,
} from '@/lib/auth';

/**
 * GET /api/admin/login
 * Check whether the caller is currently authenticated.
 */
export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({ authenticated });
}

/**
 * POST /api/admin/login
 * Attempt to log in with a plaintext password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Wrong password' },
        { status: 401 },
      );
    }

    await setAdminCookie();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/admin/login
 * Log out by clearing the admin cookie.
 */
export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ success: true });
}
