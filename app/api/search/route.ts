import { NextRequest, NextResponse } from 'next/server';
import { searchAndUpsertCategory } from '@/lib/discover';
import { isDemoMode } from '@/lib/googlePlaces';

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
    const result = await searchAndUpsertCategory(category, city, { minRating, minReviews, maxReviews });
    created.push(...result.created);
    updated.push(...result.updated);
  }

  return NextResponse.json({
    demoMode: isDemoMode(),
    createdCount: created.length,
    updatedCount: updated.length,
    hotCount: [...created, ...updated].filter((l) => l.hot).length,
    leads: [...created, ...updated],
  });
}
