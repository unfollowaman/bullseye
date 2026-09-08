import { mockupService } from '@/mockup/service';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const capabilities = mockupService.getCapabilities();
    return NextResponse.json(capabilities, { status: 200 });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Failed to retrieve mockup capabilities';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
