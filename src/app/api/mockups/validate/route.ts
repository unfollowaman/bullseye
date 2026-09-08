import { mockupService } from '@/mockup/service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = mockupService.validateConfig(body);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Failed to validate mockup configuration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
