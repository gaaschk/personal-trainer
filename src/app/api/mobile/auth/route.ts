import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { issueMobileToken } from '@/lib/mobile-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      email?: string;
      password?: string;
      deviceName?: string;
      platform?: string;
    };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user?.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { token, expiresAt } = await issueMobileToken(user.id, body.deviceName, body.platform);

    return NextResponse.json({ token, userId: user.id, email: user.email, expiresAt });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
