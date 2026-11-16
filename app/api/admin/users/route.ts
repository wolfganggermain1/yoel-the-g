import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireMinRole, hashPassword } from '@/lib/auth';
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

/** One-time password for new and reset accounts; the user must change it on first login. */
function makeTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

/**
 * GET /api/admin/users
 * List all users. Admin and above.
 */
export async function GET() {
  const user = await requireMinRole('admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const users = getAllUsers();
  const safeUsers = users.map(({ password_hash: _ph, ...rest }) => rest);
  return NextResponse.json({ users: safeUsers });
}

/**
 * POST /api/admin/users
 * Create a new user. Admin and above; only a super admin can create super admins.
 * Body: { email, displayName, role, developerId?, isFamily? }
 */
export async function POST(request: NextRequest) {
  const currentUser = await requireMinRole('admin');
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

    if (role === 'super_admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only a super admin can create super admins' },
        { status: 403 },
      );
    }

    const tempPassword = makeTempPassword();
    const tempHash = await hashPassword(tempPassword);
    createUser(
      email.toLowerCase().trim(),
      tempHash,
      displayName.trim(),
      role,
      developerId ?? null,
      isFamily ?? false,
    );

    sendWelcomeEmail(email.toLowerCase().trim(), displayName.trim(), role, tempPassword);

    // Returned once so the admin can hand it over if the email doesn't arrive.
    return NextResponse.json({ success: true, tempPassword });
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
 * Update user role, reset password, or delete user. Admin and above; super admin
 * accounts and the super admin role can only be touched by a super admin.
 * Body: { id, action: 'updateRole' | 'resetPassword' | 'delete', role? }
 */
export async function PATCH(request: NextRequest) {
  const currentUser = await requireMinRole('admin');
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

    const isSuperAdmin = currentUser.role === 'super_admin';
    if (targetUser.role === 'super_admin' && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only a super admin can change super admin accounts' },
        { status: 403 },
      );
    }
    if (role === 'super_admin' && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only a super admin can grant the super admin role' },
        { status: 403 },
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
      const tempPassword = makeTempPassword();
      resetUserPassword(id, await hashPassword(tempPassword));
      sendPasswordResetEmail(targetUser.email, targetUser.display_name, tempPassword);
      return NextResponse.json({ success: true, tempPassword });
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
