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

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.nationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.googleMapsUri',
].join(',');

/**
 * Searches Places API (New) Text Search for `category in city`. Unlike the
 * legacy Places API, the field mask can request `websiteUri` directly on
 * the search call, so this needs exactly ONE request per category/city
 * combo -- no follow-up Place Details call per candidate. That's roughly a
 * 20x reduction in API calls (and cost) versus the legacy Text Search +
 * Details-per-result approach.
 *
 * Requires "Places API (New)" enabled in Google Cloud, not just the
 * legacy "Places API".
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

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: `${category} in ${city}` }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Google Places search failed: ${json.error?.message ?? res.statusText}`);
  }

  const places: any[] = json.places ?? [];

  return places
    .filter((p) => !p.websiteUri)
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? 'Unknown',
      category,
      city,
      phone: p.nationalPhoneNumber ?? null,
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? null,
      hasWebsite: false,
      googleMapsUrl: p.googleMapsUri ?? null,
    }));
}
