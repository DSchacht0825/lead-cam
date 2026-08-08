export interface RawPlace {
  placeId: string;
  name: string;
  category: string;
  city: string;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  hasWebsite: boolean;
  googleMapsUrl: string | null;
}

const DEMO_DATA: Omit<RawPlace, 'category' | 'city'>[] = [
  {
    placeId: 'demo-jim-haworth-plumbing',
    name: 'Jim Haworth Plumbing',
    phone: '(619) 555-0142',
    rating: 5.0,
    reviewCount: 40,
    hasWebsite: false,
    googleMapsUrl: 'https://maps.google.com/?cid=demo1',
  },
  {
    placeId: 'demo-southbay-electric',
    name: 'South Bay Electric Co.',
    phone: '(619) 555-0198',
    rating: 4.8,
    reviewCount: 27,
    hasWebsite: false,
    googleMapsUrl: 'https://maps.google.com/?cid=demo2',
  },
  {
    placeId: 'demo-vista-landscaping',
    name: 'Vista Landscaping & Sons',
    phone: '(760) 555-0110',
    rating: 4.6,
    reviewCount: 63,
    hasWebsite: false,
    googleMapsUrl: 'https://maps.google.com/?cid=demo3',
  },
  {
    placeId: 'demo-oceanside-hvac',
    name: 'Oceanside HVAC Repair',
    phone: null,
    rating: 4.9,
    reviewCount: 15,
    hasWebsite: false,
    googleMapsUrl: 'https://maps.google.com/?cid=demo4',
  },
  {
    placeId: 'demo-elcajon-detailing',
    name: 'El Cajon Mobile Detailing',
    phone: '(619) 555-0177',
    rating: 4.7,
    reviewCount: 88,
    hasWebsite: false,
    googleMapsUrl: 'https://maps.google.com/?cid=demo5',
  },
];

export function isDemoMode(): boolean {
  return !process.env.GOOGLE_PLACES_API_KEY;
}

/**
 * Searches Google Places Text Search for `category near city`, then calls
 * Place Details on each result to check for a website. Returns only
 * businesses that have NO website on file -- that's the whole point.
 *
 * Falls back to a small canned dataset when GOOGLE_PLACES_API_KEY is unset
 * so the app is usable before you've wired up Google Cloud billing.
 */
export async function findLeadsWithoutWebsite(
  category: string,
  city: string
): Promise<RawPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return DEMO_DATA.map((d) => ({ ...d, category, city }));
  }

  const query = encodeURIComponent(`${category} in ${city}`);
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  const searchJson = await searchRes.json();

  if (searchJson.status !== 'OK' && searchJson.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places search failed: ${searchJson.status} ${searchJson.error_message ?? ''}`);
  }

  const candidates: any[] = searchJson.results ?? [];
  const results: RawPlace[] = [];

  for (const candidate of candidates) {
    const placeId = candidate.place_id;
    const fields = 'name,formatted_phone_number,rating,user_ratings_total,website,url';
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsJson = await detailsRes.json();

    if (detailsJson.status !== 'OK') continue;
    const d = detailsJson.result;

    if (d.website) continue; // has a website already -- not our target

    results.push({
      placeId,
      name: d.name ?? candidate.name,
      category,
      city,
      phone: d.formatted_phone_number ?? null,
      rating: d.rating ?? candidate.rating ?? null,
      reviewCount: d.user_ratings_total ?? candidate.user_ratings_total ?? null,
      hasWebsite: false,
      googleMapsUrl: d.url ?? null,
    });
  }

  return results;
}
