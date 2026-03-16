import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail, getUserById, type User, type UserRole } from "./db";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTH_COOKIE = "yoel-admin-auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const BCRYPT_ROUNDS = 12;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

// ---------------------------------------------------------------------------
// JWT payload type
// ---------------------------------------------------------------------------

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
  displayName: string;
  developerId: number | null;
  mustChangePassword: boolean;
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// JWT operations
// ---------------------------------------------------------------------------

export function signToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    displayName: user.display_name,
    developerId: user.developer_id,
    mustChangePassword: user.must_change_password === 1,
  };

  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie operations
// ---------------------------------------------------------------------------

export async function setAuthCookie(user: User): Promise<void> {
  const token = signToken(user);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

// ---------------------------------------------------------------------------
// Authentication check
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE);
  if (!cookie) return null;

  const payload = verifyToken(cookie.value);
  if (!payload) return null;

  // Verify user still exists and return fresh role data from DB
  const user = getUserById(payload.userId);
  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    displayName: user.display_name,
    developerId: user.developer_id,
    mustChangePassword: user.must_change_password === 1,
  };
}

/**
 * Backward-compatible check used by existing API routes.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// ---------------------------------------------------------------------------
// Role-based authorization
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  family_dev: 2,
  outside_dev: 1,
};

export async function requireRole(
  ...roles: UserRole[]
): Promise<JwtPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!roles.includes(user.role)) return null;
  return user;
}

export async function requireMinRole(
  minRole: UserRole
): Promise<JwtPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minRole]) return null;
  return user;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const user = getUserByEmail(email.toLowerCase().trim());
  if (!user) return null;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  return user;
}
