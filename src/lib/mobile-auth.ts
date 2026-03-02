import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

const EXPIRY_DAYS = 90;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET not set');
  return new TextEncoder().encode(secret);
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function issueMobileToken(
  userId: string,
  deviceName?: string,
  platform?: string,
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(getSecret());

  await prisma.mobileToken.create({
    data: {
      userId,
      tokenHash:  hashToken(token),
      deviceName: deviceName ?? null,
      platform:   platform ?? null,
      lastUsedAt: new Date(),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function verifyMobileToken(raw: string): Promise<string> {
  // Verify JWT signature and expiry
  const { payload } = await jwtVerify(raw, getSecret());
  const userId = payload.sub;
  if (!userId) throw new Error('Missing sub in token');

  // Check DB row exists and is not expired
  const hash = hashToken(raw);
  const record = await prisma.mobileToken.findUnique({ where: { tokenHash: hash } });
  if (!record) throw new Error('Token not found');
  if (record.expiresAt < new Date()) throw new Error('Token expired');

  // Bump lastUsedAt asynchronously — don't block the request
  prisma.mobileToken
    .update({ where: { tokenHash: hash }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return userId;
}

export function hashTokenPublic(raw: string): string {
  return hashToken(raw);
}
