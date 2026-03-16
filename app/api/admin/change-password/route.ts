import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword, hashPassword, setAuthCookie } from '@/lib/auth';
import { getUserById, updateUserPassword } from '@/lib/db';
import { sendPasswordChangedEmail } from '@/lib/email';

/**
 * POST /api/admin/change-password
 * Change the current user's password.
 * Body: { currentPassword, newPassword }
 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current and new passwords are required' },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters' },
        { status: 400 },
      );
    }

    const user = getUserById(currentUser.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 },
      );
    }

    const newHash = await hashPassword(newPassword);
    updateUserPassword(user.id, newHash);

    // Refresh cookie with updated must_change_password = false
    const updatedUser = getUserById(user.id);
    if (updatedUser) {
      await setAuthCookie(updatedUser);
    }

    sendPasswordChangedEmail(user.email, user.display_name);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}
