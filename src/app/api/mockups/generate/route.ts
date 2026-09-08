import { mockupService } from '@/mockup/service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const valResult = mockupService.validateConfig(body);
    if (!valResult.valid || !valResult.sanitizedConfig) {
      return NextResponse.json(
        { error: 'Invalid mockup configuration', details: valResult.errors },
        { status: 400 }
      );
    }

    const mockup = await mockupService.generateMockup(valResult.sanitizedConfig);
    return NextResponse.json(mockup, { status: 201 });
  } catch (err: unknown) {
    console.error('API /api/mockups/generate error:', err);
    const message = (err as Error).message || 'Failed to generate mockup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
