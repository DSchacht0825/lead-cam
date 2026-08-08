'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATUSES, STATUS_LABELS, StatusValue } from '@/lib/status';

interface Lead {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number | null;
  reviewCount: number | null;
  score: number;
  hot: boolean;
  status: StatusValue;
}

interface DiscoveryRun {
  createdAt: string;
  combosRun: number;
  createdLeads: number;
  updatedLeads: number;
  hotLeads: number;
  error: string | null;
}

function SweepBanner({ run }: { run: DiscoveryRun | null }) {
  if (!run) return null;

  const when = new Date(run.createdAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex-1 bg-white border rounded-lg px-4 py-2 text-sm flex items-center justify-between">
      <span>
        Last sweep: <span className="text-slate-500">{when}</span> — {run.createdLeads} new,{' '}
        {run.updatedLeads} updated, <strong>{run.hotLeads} 🔥 hot</strong> across {run.combosRun} searches
      </span>
      {run.error && <span className="text-amber-600 text-xs">{run.error}</span>}
    </div>
  );
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lastRun, setLastRun] = useState<DiscoveryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);

  const load = async () => {
    setLoading(true);
    const [leadsRes, runsRes] = await Promise.all([
      fetch('/api/leads'),
      fetch('/api/discovery-runs'),
    ]);
    const leadsJson = await leadsRes.json();
    const runsJson = await runsRes.json();
    setLeads(leadsJson.leads ?? []);
    setLastRun(runsJson.lastRun ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const getLeads = async () => {
    setSweeping(true);
    try {
      await fetch('/api/discover', { method: 'POST' });
      await load();
    } finally {
      setSweeping(false);
    }
  };

  const setStatus = async (id: string, status: StatusValue) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  };

  const getLeadsButton = (
    <button
      onClick={getLeads}
      disabled={sweeping}
      className="bg-slate-900 text-white rounded px-4 py-2 text-sm disabled:opacity-50 whitespace-nowrap"
    >
      {sweeping ? 'Searching...' : 'Get Leads'}
    </button>
  );

  if (loading) return <p className="text-slate-500">Loading pipeline...</p>;

  if (leads.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4 gap-4">
          <SweepBanner run={lastRun} />
          {getLeadsButton}
        </div>
        <div className="text-center py-20">
          <p className="text-slate-600 mb-4">
            No leads yet. Click "Get Leads" to run a sweep of Google Places for local businesses
            with no website — or use the <Link href="/search" className="text-blue-600 underline">
              Find Leads
            </Link> page to target a specific city/category.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <SweepBanner run={lastRun} />
        {getLeadsButton}
      </div>
      <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max pb-4">
        {STATUSES.map((status) => {
          const columnLeads = leads.filter((l) => l.status === status);
          return (
            <div key={status} className="w-72 flex-shrink-0">
              <h2 className="font-medium text-sm text-slate-500 mb-2 flex items-center justify-between">
                <span>{STATUS_LABELS[status]}</span>
                <span className="text-slate-400">{columnLeads.length}</span>
              </h2>
              <div className="space-y-2">
                {columnLeads.map((lead) => (
                  <div key={lead.id} className="bg-white border rounded-lg p-3 shadow-sm">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.hot && <span title="Hot lead">🔥 </span>}
                      {lead.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {lead.category} · {lead.city}
                    </p>
                    <p className="text-xs text-slate-500">
                      {lead.rating ? `${lead.rating}★` : 'no rating'}
                      {lead.reviewCount ? ` (${lead.reviewCount})` : ''} · score {lead.score}
                    </p>
                    <select
                      className="mt-2 w-full text-xs border rounded px-1 py-1"
                      value={lead.status}
                      onChange={(e) => setStatus(lead.id, e.target.value as StatusValue)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
