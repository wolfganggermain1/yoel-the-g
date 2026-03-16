import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  setAuthCookie,
  getCurrentUser,
  clearAuthCookie,
} from '@/lib/auth';

/**
 * GET /api/admin/login
 * Check whether the caller is currently authenticated.
 * Returns user info if authenticated.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      developerId: user.developerId,
      mustChangePassword: user.mustChangePassword,
    },
  });
}

/**
 * POST /api/admin/login
 * Attempt to log in with email + password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    await setAuthCookie(user);

    return NextResponse.json({
      success: true,
      user: {
        userId: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        mustChangePassword: user.must_change_password === 1,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/admin/login
 * Log out by clearing the auth cookie.
 */
export async function DELETE() {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}
