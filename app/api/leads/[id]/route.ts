import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeScore } from '@/lib/scoring';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { activity: { orderBy: { createdAt: 'desc' } } },
  });
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const existing = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const merged = { ...existing, ...body };
  const { score, hot } = computeScore({
    hasWebsite: merged.hasWebsite,
    rating: merged.rating,
    reviewCount: merged.reviewCount,
    phone: merged.phone,
    facebookUrl: merged.facebookUrl,
    facebookActive: merged.facebookActive,
    ownerOperated: merged.ownerOperated,
  });

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: { ...body, score, hot },
  });

  if (body.status && body.status !== existing.status) {
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'status_change',
        message: `Status changed from ${existing.status} to ${body.status}`,
      },
    });
  }

  return NextResponse.json({ lead });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.lead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
