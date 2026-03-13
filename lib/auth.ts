import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_COOKIE = 'yoel-admin-auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Generates a deterministic token from the admin password.
 * Used as the cookie value to verify authentication.
 */
function generateToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? '';
  const secret = 'yoel-the-g-admin-secret';
  return crypto.createHash('sha256').update(`${password}:${secret}`).digest('hex');
}

/**
 * Validate a plaintext password against the environment variable.
 */
export function validatePassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

/**
 * Set an HTTP-only auth cookie after successful login.
 */
export async function setAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, generateToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Check whether the current request has a valid admin cookie.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE);
  if (!cookie) return false;
  return cookie.value === generateToken();
}

/**
 * Remove the admin cookie (logout).
 */
export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
