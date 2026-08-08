'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { computeScore } from '@/lib/scoring';

interface Activity {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  category: string;
  city: string;
  phone: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  hasWebsite: boolean;
  facebookUrl: string | null;
  facebookActive: boolean;
  instagramUrl: string | null;
  ownerOperated: boolean;
  score: number;
  hot: boolean;
  status: string;
  notes: string | null;
  activity: Activity[];
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [note, setNote] = useState('');
  const [outreach, setOutreach] = useState<string | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/leads/${id}`);
    const json = await res.json();
    setLead(json.lead);
  };

  useEffect(() => {
    load();
  }, [id]);

  const patch = async (data: Partial<Lead>) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setLead((prev) => (prev ? { ...prev, ...json.lead } : json.lead));
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await fetch(`/api/leads/${id}/activity`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'note', message: note }),
    });
    setNote('');
    load();
  };

  const fetchOutreach = async () => {
    setOutreachLoading(true);
    const res = await fetch(`/api/leads/${id}/outreach`);
    const json = await res.json();
    setOutreach(json.message);
    setOutreachLoading(false);
  };

  if (!lead) return <p className="text-slate-500">Loading...</p>;

  const { breakdown } = computeScore({
    hasWebsite: lead.hasWebsite,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    phone: lead.phone,
    facebookUrl: lead.facebookUrl,
    facebookActive: lead.facebookActive,
    ownerOperated: lead.ownerOperated,
  });

  const fbSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `site:facebook.com "${lead.name}" ${lead.city}`
  )}`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {lead.hot && '🔥 '}
          {lead.name}
        </h1>
        <p className="text-sm text-slate-500">
          {lead.category} · {lead.city} · score {lead.score}
        </p>
      </div>

      <section className="bg-white border rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500">Phone</p>
          <p>{lead.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-500">Google rating</p>
          <p>{lead.rating ? `${lead.rating}★ (${lead.reviewCount} reviews)` : '—'}</p>
        </div>
        <div>
          <p className="text-slate-500">Website</p>
          <p>{lead.hasWebsite ? 'Has one' : 'None on file'}</p>
        </div>
        <div>
          <p className="text-slate-500">Google Maps</p>
          {lead.googleMapsUrl ? (
            <a href={lead.googleMapsUrl} target="_blank" className="text-blue-600 underline">
              View listing
            </a>
          ) : (
            <p>—</p>
          )}
        </div>
      </section>

      <section className="bg-white border rounded-lg p-4 space-y-3 text-sm">
        <h2 className="font-medium">Social / manual enrichment</h2>
        <p className="text-xs text-slate-500">
          Facebook isn't auto-scraped (against their ToS) — use this search link to find the page,
          then paste the URL in.
        </p>
        <a href={fbSearchUrl} target="_blank" className="text-blue-600 underline text-xs">
          Search Facebook for {lead.name} →
        </a>
        <div>
          <label className="block text-xs font-medium mb-1">Facebook URL</label>
          <input
            className="w-full border rounded px-2 py-1"
            defaultValue={lead.facebookUrl ?? ''}
            onBlur={(e) => patch({ facebookUrl: e.target.value || null })}
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            defaultChecked={lead.facebookActive}
            onChange={(e) => patch({ facebookActive: e.target.checked })}
          />
          Facebook page looks active recently
        </label>
        <div>
          <label className="block text-xs font-medium mb-1">Instagram URL</label>
          <input
            className="w-full border rounded px-2 py-1"
            defaultValue={lead.instagramUrl ?? ''}
            onBlur={(e) => patch({ instagramUrl: e.target.value || null })}
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            defaultChecked={lead.ownerOperated}
            onChange={(e) => patch({ ownerOperated: e.target.checked })}
          />
          Owner-operated / local
        </label>
      </section>

      <section className="bg-white border rounded-lg p-4 text-sm">
        <h2 className="font-medium mb-2">Score breakdown ({lead.score} pts)</h2>
        <ul className="space-y-1">
          {breakdown.map((b) => (
            <li key={b.label} className="flex justify-between text-xs">
              <span>{b.label}</span>
              <span>+{b.points}</span>
            </li>
          ))}
          {breakdown.length === 0 && <li className="text-xs text-slate-500">No signals yet.</li>}
        </ul>
      </section>

      <section className="bg-white border rounded-lg p-4 text-sm space-y-3">
        <h2 className="font-medium">Outreach message</h2>
        <button
          onClick={fetchOutreach}
          disabled={outreachLoading}
          className="bg-slate-900 text-white rounded px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {outreachLoading ? 'Generating...' : 'Generate opening line'}
        </button>
        {outreach && (
          <div className="bg-slate-50 border rounded p-3 text-xs whitespace-pre-wrap">{outreach}</div>
        )}
      </section>

      <section className="bg-white border rounded-lg p-4 text-sm space-y-3">
        <h2 className="font-medium">Notes & activity</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-2 py-1"
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
          />
          <button onClick={addNote} className="bg-slate-900 text-white rounded px-3 py-1 text-xs">
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {lead.activity.map((a) => (
            <li key={a.id} className="text-xs border-b pb-2">
              <span className="text-slate-400">{new Date(a.createdAt).toLocaleString()}</span> —{' '}
              {a.message}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
