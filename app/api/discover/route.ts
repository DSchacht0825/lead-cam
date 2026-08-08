import { NextResponse } from 'next/server';
import { runSweep, DEFAULT_CATEGORIES, DEFAULT_CITIES, DEFAULT_FILTERS } from '@/lib/discover';

/**
 * Manual, on-demand version of the sweep -- triggered by the "Get Leads"
 * button on the dashboard instead of a schedule. Runs the same default
 * 15-category x 8-city grid as /api/cron/discover, just user-triggered so
 * nothing runs (and nothing gets spent on Google Places) unless you click it.
 */
export async function POST() {
  const summary = await runSweep(DEFAULT_CATEGORIES, DEFAULT_CITIES, DEFAULT_FILTERS);
  return NextResponse.json(summary);
}
