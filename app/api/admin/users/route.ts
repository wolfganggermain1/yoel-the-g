import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword } from '@/lib/auth';
import {
  getAllUsers,
  createUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  getUserById,
  type UserRole,
} from '@/lib/db';
import { sendWelcomeEmail, sendPasswordResetEmail, sendRoleUpdatedEmail } from '@/lib/email';

/**
 * GET /api/admin/users
 * List all users. Super admin only.
 */
export async function GET() {
  const user = await requireRole('super_admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const users = getAllUsers();
  const safeUsers = users.map(({ password_hash: _ph, ...rest }) => rest);
  return NextResponse.json({ users: safeUsers });
}

/**
 * POST /api/admin/users
 * Create a new user. Super admin only.
 * Body: { email, displayName, role, developerId?, isFamily? }
 */
export async function POST(request: NextRequest) {
  const currentUser = await requireRole('super_admin');
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, displayName, role, developerId, isFamily } = body as {
      email?: string;
      displayName?: string;
      role?: UserRole;
      developerId?: number;
      isFamily?: boolean;
    };

    if (!email || !displayName || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, display name, and role are required' },
        { status: 400 },
      );
    }

    const validRoles: UserRole[] = ['super_admin', 'admin', 'family_dev', 'outside_dev'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 },
      );
    }

    const defaultHash = await hashPassword('changeme123');
    createUser(
      email.toLowerCase().trim(),
      defaultHash,
      displayName.trim(),
      role,
      developerId ?? null,
      isFamily ?? false,
    );

    sendWelcomeEmail(email.toLowerCase().trim(), displayName.trim(), role, 'changeme123');

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update user role, reset password, or delete user. Super admin only.
 * Body: { id, action: 'updateRole' | 'resetPassword' | 'delete', role? }
 */
export async function PATCH(request: NextRequest) {
  const currentUser = await requireRole('super_admin');
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, action, role } = body as {
      id?: number;
      action?: string;
      role?: UserRole;
    };

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing id or action' },
        { status: 400 },
      );
    }

    if (id === currentUser.userId && action === 'delete') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 },
      );
    }

    const targetUser = getUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    if (action === 'updateRole') {
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Role is required' },
          { status: 400 },
        );
      }
      updateUserRole(id, role);
      sendRoleUpdatedEmail(targetUser.email, targetUser.display_name, role);
      return NextResponse.json({ success: true });
    }

    if (action === 'resetPassword') {
      const defaultHash = await hashPassword('changeme123');
      resetUserPassword(id, defaultHash);
      sendPasswordResetEmail(targetUser.email, targetUser.display_name, 'changeme123');
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      deleteUser(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}
