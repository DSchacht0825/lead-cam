import { prisma } from '@/lib/prisma';
import { findLeadsWithoutWebsite, isDemoMode } from '@/lib/googlePlaces';
import { computeScore } from '@/lib/scoring';
import { mapWithConcurrency } from '@/lib/concurrency';

// Home-service categories that skew toward small, often website-less
// operators, and that read as a clear before/after when you pitch a site.
export const DEFAULT_CATEGORIES = [
  'plumber',
  'electrician',
  'landscaper',
  'HVAC contractor',
  'mobile detailing',
  'concrete contractor',
  'roofer',
  'painter',
  'handyman',
  'pest control',
  'tree service',
  'appliance repair',
  'garage door repair',
  'fence contractor',
  'pressure washing',
];

// A spread of mid-size US metros rather than one metro area -- more total
// addressable market before a category/city combo gets fully mined out.
export const DEFAULT_CITIES = [
  'San Diego, CA',
  'Austin, TX',
  'Phoenix, AZ',
  'Denver, CO',
  'Nashville, TN',
  'Charlotte, NC',
  'Tampa, FL',
  'Columbus, OH',
];

export interface SweepFilters {
  minRating: number;
  minReviews: number;
  maxReviews: number;
}

export const DEFAULT_FILTERS: SweepFilters = {
  minRating: 4.5,
  minReviews: 10,
  maxReviews: 200,
};

export interface SweepSummary {
  demoMode: boolean;
  combosRun: number;
  createdCount: number;
  updatedCount: number;
  hotCount: number;
  leads: any[];
}

/**
 * Searches one category in one city, filters by rating/reviews, scores,
 * and upserts into the Lead table. Shared by the manual /search page and
 * the automated daily cron sweep so scoring/persistence stay in one place.
 */
export async function searchAndUpsertCategory(
  category: string,
  city: string,
  filters: SweepFilters
) {
  const raw = await findLeadsWithoutWebsite(category, city);
  const created: any[] = [];
  const updated: any[] = [];

  for (const r of raw) {
    if ((r.rating ?? 0) < filters.minRating) continue;
    if ((r.reviewCount ?? 0) < filters.minReviews || (r.reviewCount ?? 0) > filters.maxReviews) continue;

    const { score, hot } = computeScore({
      hasWebsite: r.hasWebsite,
      rating: r.rating,
      reviewCount: r.reviewCount,
      phone: r.phone,
      email: null,
      facebookUrl: null,
      facebookActive: false,
      ownerOperated: false,
    });

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

    const existing = await prisma.lead.findUnique({ where: { placeId: r.placeId } });
    if (existing) {
      updated.push(await prisma.lead.update({ where: { placeId: r.placeId }, data }));
    } else {
      created.push(await prisma.lead.create({ data: { placeId: r.placeId, ...data } }));
    }
  }

  return { created, updated };
}

/**
 * Runs the category x city grid, upserts everything found, and records a
 * DiscoveryRun row so the dashboard can show "last sweep found N leads."
 */
export async function runSweep(
  categories: string[],
  cities: string[],
  filters: SweepFilters = DEFAULT_FILTERS
): Promise<SweepSummary> {
  const createdAll: any[] = [];
  const updatedAll: any[] = [];

  // Each combo is now a single Places API call (see lib/googlePlaces.ts),
  // so the whole city x category grid can run as one flattened,
  // concurrency-capped pass instead of chunking by city. A failure on one
  // combo (rate limit, transient error) is caught per-combo so it doesn't
  // discard results already found by the other 100+ combos in the sweep.
  const combos = cities.flatMap((city) => categories.map((category) => ({ city, category })));

  const perCombo = await mapWithConcurrency(combos, 10, async ({ city, category }) => {
    try {
      return await searchAndUpsertCategory(category, city, filters);
    } catch (err: any) {
      return { created: [], updated: [], failedCombo: `${category} in ${city}: ${err.message ?? err}` };
    }
  });

  const failures: string[] = [];
  for (const result of perCombo) {
    createdAll.push(...result.created);
    updatedAll.push(...result.updated);
    if ('failedCombo' in result && result.failedCombo) failures.push(result.failedCombo);
  }

  const hotCount = [...createdAll, ...updatedAll].filter((l) => l.hot).length;
  const error = failures.length ? `${failures.length}/${combos.length} combos failed: ${failures.slice(0, 5).join('; ')}` : null;

  await prisma.discoveryRun.create({
    data: {
      citiesCount: cities.length,
      categoriesCount: categories.length,
      combosRun: combos.length,
      createdLeads: createdAll.length,
      updatedLeads: updatedAll.length,
      hotLeads: hotCount,
      error,
    },
  });

  return {
    demoMode: isDemoMode(),
    combosRun: cities.length * categories.length,
    createdCount: createdAll.length,
    updatedCount: updatedAll.length,
    hotCount,
    leads: [...createdAll, ...updatedAll],
  };
}
