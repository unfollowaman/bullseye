import { NextResponse } from 'next/server';
import { visualQAService } from '@/visual-qa/service';

export async function GET() {
  try {
    const capabilities = visualQAService.getCapabilities();
    return NextResponse.json(capabilities, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to retrieve capabilities.' },
      { status: 500 }
    );
  }
}
