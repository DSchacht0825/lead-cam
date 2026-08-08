import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  const leads = await prisma.lead.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ leads });
}
