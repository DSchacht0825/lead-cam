import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { message, type } = await req.json();
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });

  const activity = await prisma.activity.create({
    data: { leadId: params.id, type: type ?? 'note', message },
  });

  return NextResponse.json({ activity });
}
