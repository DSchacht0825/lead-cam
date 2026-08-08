export interface ScoreInput {
  hasWebsite: boolean;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  facebookUrl: string | null;
  facebookActive: boolean;
  ownerOperated: boolean;
}

export interface ScoreResult {
  score: number;
  hot: boolean;
  breakdown: { label: string; points: number }[];
}

export const HOT_THRESHOLD = 70;

export function computeScore(input: ScoreInput): ScoreResult {
  const breakdown: { label: string; points: number }[] = [];

  const add = (label: string, points: number) => {
    if (points !== 0) breakdown.push({ label, points });
  };

  if (!input.hasWebsite) add('No website', 30);
  if ((input.rating ?? 0) >= 4.5) add('4.5★+ Google rating', 20);
  if ((input.reviewCount ?? 0) >= 10 && (input.reviewCount ?? 0) <= 100) {
    add('10-100 reviews', 15);
  }
  if (input.phone) add('Phone available', 10);
  if (input.facebookUrl) add('Facebook page exists', 10);
  if (input.facebookActive) add('Facebook active recently', 10);
  if (input.ownerOperated) add('Owner-operated / local', 5);

  const score = breakdown.reduce((sum, b) => sum + b.points, 0);
  return { score, hot: score >= HOT_THRESHOLD, breakdown };
}
