import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const secretBytes = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-insecure'
);

const COOKIE_NAME = 'session';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretBytes);
}

export async function getAuthUser(
  request: Request
): Promise<{ userId: number } | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`)
  );
  const token = match ? decodeURIComponent(match[1]) : null;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretBytes, {
      algorithms: ['HS256'],
    });
    return payload as { userId: number };
  } catch {
    return null;
  }
}

export function createSessionCookie(token: string): string {
  const parts = [
    `session=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${MAX_AGE}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(): string {
  return [
    'session=',
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
  ].join('; ');
}
