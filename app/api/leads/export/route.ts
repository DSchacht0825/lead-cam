import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { STATUS_LABELS, StatusValue } from '@/lib/status';

function csvEscape(value: string | number | boolean | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const leads = await prisma.lead.findMany({ orderBy: { score: 'desc' } });

  const header = [
    'Business',
    'Category',
    'City',
    'Phone',
    'Email',
    'Facebook',
    'Google rating',
    'Reviews',
    'Website?',
    'Contacted?',
    'Status',
  ];

  const rows = leads.map((l) =>
    [
      l.name,
      l.category,
      l.city,
      l.phone ?? '',
      l.email ?? '',
      l.facebookUrl ?? '',
      l.rating ?? '',
      l.reviewCount ?? '',
      l.hasWebsite ? 'Yes' : 'No',
      l.status === 'NEW' ? 'No' : 'Yes',
      STATUS_LABELS[l.status as StatusValue],
    ]
      .map(csvEscape)
      .join(',')
  );

  const csv = [header.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="lead-sheet-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
