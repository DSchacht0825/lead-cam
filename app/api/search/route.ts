import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findLeadsWithoutWebsite, isDemoMode } from '@/lib/googlePlaces';
import { computeScore } from '@/lib/scoring';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { city, categories, minRating, minReviews, maxReviews } = body as {
    city: string;
    categories: string[];
    minRating: number;
    minReviews: number;
    maxReviews: number;
  };

  if (!city || !categories?.length) {
    return NextResponse.json({ error: 'city and categories are required' }, { status: 400 });
  }

  const created: any[] = [];
  const updated: any[] = [];

  for (const category of categories) {
    const raw = await findLeadsWithoutWebsite(category, city);

    for (const r of raw) {
      if ((r.rating ?? 0) < minRating) continue;
      if ((r.reviewCount ?? 0) < minReviews || (r.reviewCount ?? 0) > maxReviews) continue;

      const { score, hot } = computeScore({
        hasWebsite: r.hasWebsite,
        rating: r.rating,
        reviewCount: r.reviewCount,
        phone: r.phone,
        facebookUrl: null,
        facebookActive: false,
        ownerOperated: false,
      });

      const existing = await prisma.lead.findUnique({ where: { placeId: r.placeId } });

      const data = {
        name: r.name,
        category: r.category,
        city: r.city,
        phone: r.phone,
        rating: r.rating,
        reviewCount: r.reviewCount,
        hasWebsite: r.hasWebsite,
        googleMapsUrl: r.googleMapsUrl,
        score,
        hot,
      };

      if (existing) {
        const lead = await prisma.lead.update({ where: { placeId: r.placeId }, data });
        updated.push(lead);
      } else {
        const lead = await prisma.lead.create({ data: { placeId: r.placeId, ...data } });
        created.push(lead);
      }
    }
  }

  return NextResponse.json({
    demoMode: isDemoMode(),
    createdCount: created.length,
    updatedCount: updated.length,
    hotCount: [...created, ...updated].filter((l) => l.hot).length,
    leads: [...created, ...updated],
  });
}
