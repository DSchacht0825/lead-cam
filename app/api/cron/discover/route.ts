import { NextRequest, NextResponse } from 'next/server';
import { runSweep, DEFAULT_CATEGORIES, DEFAULT_CITIES, DEFAULT_FILTERS } from '@/lib/discover';

// Vercel Cron Jobs automatically send `Authorization: Bearer ${CRON_SECRET}`
// on requests it triggers, letting us reject anyone else hitting this path.
// See https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Optional ?city= for manual/local testing of a single city; the daily
  // cron (see vercel.json) omits it and sweeps every default city.
  const cityParam = req.nextUrl.searchParams.get('city');
  const cities = cityParam ? [cityParam] : DEFAULT_CITIES;

  const summary = await runSweep(DEFAULT_CATEGORIES, cities, DEFAULT_FILTERS);
  return NextResponse.json(summary);
}

export const maxDuration = 60;
