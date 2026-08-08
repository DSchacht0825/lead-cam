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

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/leads');
    const json = await res.json();
    setLeads(json.leads ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: StatusValue) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  };

  if (loading) return <p className="text-slate-500">Loading pipeline...</p>;

  if (leads.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-600 mb-4">No leads yet.</p>
        <Link href="/search" className="text-blue-600 underline">
          Find your first batch of leads
        </Link>
      </div>
    );
  }

  return (
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
  );
}
