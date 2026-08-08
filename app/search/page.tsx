'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Result {
  id: string;
  name: string;
  score: number;
  hot: boolean;
}

export default function SearchPage() {
  const [city, setCity] = useState('San Diego, CA');
  const [categoriesText, setCategoriesText] = useState('plumber, electrician, landscaper');
  const [minRating, setMinRating] = useState(4.5);
  const [minReviews, setMinReviews] = useState(10);
  const [maxReviews, setMaxReviews] = useState(200);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    createdCount: number;
    updatedCount: number;
    hotCount: number;
    demoMode: boolean;
    leads: Result[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSummary(null);

    const categories = categoriesText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ city, categories, minRating, minReviews, maxReviews }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'search failed');
      setSummary(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-1">Find Leads</h1>
      <p className="text-sm text-slate-500 mb-6">
        Searches Google Places for businesses in your categories with no website on file, then
        auto-scores each one.
      </p>

      <form onSubmit={submit} className="space-y-4 bg-white border rounded-lg p-4">
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="San Diego, CA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Categories (comma separated)</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            placeholder="plumber, electrician, mobile detailing"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Min rating</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              className="w-full border rounded px-3 py-2"
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min reviews</label>
            <input
              type="number"
              min="0"
              className="w-full border rounded px-3 py-2"
              value={minReviews}
              onChange={(e) => setMinReviews(parseInt(e.target.value, 10))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max reviews</label>
            <input
              type="number"
              min="0"
              className="w-full border rounded px-3 py-2"
              value={maxReviews}
              onChange={(e) => setMaxReviews(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-slate-900 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Find Leads'}
        </button>
      </form>

      {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}

      {summary && (
        <div className="mt-6 bg-white border rounded-lg p-4">
          {summary.demoMode && (
            <p className="text-amber-600 text-xs mb-2">
              No GOOGLE_PLACES_API_KEY set — showing demo/sample data. Add a key in .env to search real
              businesses.
            </p>
          )}
          <p className="text-sm mb-3">
            {summary.createdCount} new · {summary.updatedCount} updated ·{' '}
            <strong>{summary.hotCount} 🔥 hot leads</strong>
          </p>
          <ul className="space-y-1 text-sm">
            {summary.leads.map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="hover:underline">
                  {l.hot && '🔥 '}
                  {l.name} — score {l.score}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/" className="inline-block mt-4 text-blue-600 text-sm underline">
            View pipeline →
          </Link>
        </div>
      )}
    </div>
  );
}
