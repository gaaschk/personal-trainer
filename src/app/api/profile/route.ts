import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const profile = await prisma.healthProfile.findUnique({
    where: { userId },
    include: {
      injuries:       { orderBy: { createdAt: 'desc' } },
      goals:          { orderBy: { createdAt: 'desc' } },
      equipmentItems: { orderBy: { createdAt: 'asc' } },
      gymMemberships: { orderBy: { createdAt: 'asc' } },
    },
  });

  return NextResponse.json(profile ?? null);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as {
    age?: number;
    weightKg?: number;
    heightCm?: number;
    fitnessLevel?: string;
    notes?: string;
  };

  const profile = await prisma.healthProfile.upsert({
    where: { userId },
    update: {
      age:          body.age ?? undefined,
      weightKg:     body.weightKg ?? undefined,
      heightCm:     body.heightCm ?? undefined,
      fitnessLevel: (body.fitnessLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') ?? undefined,
      notes:        body.notes ?? undefined,
    },
    create: {
      userId,
      age:          body.age ?? null,
      weightKg:     body.weightKg ?? null,
      heightCm:     body.heightCm ?? null,
      fitnessLevel: (body.fitnessLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') ?? 'BEGINNER',
      notes:        body.notes ?? null,
    },
  });

  return NextResponse.json(profile);
}
