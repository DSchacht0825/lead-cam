import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const lastRun = await prisma.discoveryRun.findFirst({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ lastRun });
}
