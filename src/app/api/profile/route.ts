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
    locationName?: string;
    latitude?: number;
    longitude?: number;
  };

  // Geocode location if a name was provided without coordinates
  let lat = body.latitude;
  let lon = body.longitude;
  let locationDisplay = body.locationName;
  if (body.locationName && (lat === undefined || lon === undefined)) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(body.locationName)}&count=1&language=en&format=json`;
      const geoRes  = await fetch(url);
      const geoData = await geoRes.json() as { results?: { latitude: number; longitude: number; name: string; country: string; admin1?: string }[] };
      const r = geoData.results?.[0];
      if (r) {
        lat = r.latitude;
        lon = r.longitude;
        locationDisplay = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      }
    } catch { /* ignore geocoding failure */ }
  }

  const profile = await prisma.healthProfile.upsert({
    where: { userId },
    update: {
      age:          body.age ?? undefined,
      weightKg:     body.weightKg ?? undefined,
      heightCm:     body.heightCm ?? undefined,
      fitnessLevel: (body.fitnessLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') ?? undefined,
      notes:        body.notes ?? undefined,
      ...(locationDisplay !== undefined && { locationName: locationDisplay }),
      ...(lat !== undefined && { latitude: lat }),
      ...(lon !== undefined && { longitude: lon }),
    },
    create: {
      userId,
      age:          body.age ?? null,
      weightKg:     body.weightKg ?? null,
      heightCm:     body.heightCm ?? null,
      fitnessLevel: (body.fitnessLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') ?? 'BEGINNER',
      notes:        body.notes ?? null,
      locationName: locationDisplay ?? null,
      latitude:     lat ?? null,
      longitude:    lon ?? null,
    },
  });

  return NextResponse.json(profile);
}
