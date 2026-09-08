import { mockupService } from '@/mockup/service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceCaptureId = searchParams.get('sourceCaptureId') || undefined;
    const mockupType = searchParams.get('mockupType') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined;

    const mockups = mockupService.listMockups({
      sourceCaptureId,
      mockupType,
      limit,
      offset,
    });

    return NextResponse.json(mockups, { status: 200 });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Failed to list mockups';
    return NextResponse.json({ error: message, category: 'internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body', category: 'validation' },
        { status: 400 }
      );
    }

    const validation = mockupService.validateConfig(body);
    if (!validation.valid || !validation.sanitizedConfig) {
      return NextResponse.json(
        { error: 'Invalid mockup configuration', errors: validation.errors, category: 'validation' },
        { status: 400 }
      );
    }

    const result = await mockupService.generateMockup(validation.sanitizedConfig);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Failed to generate mockup';
    return NextResponse.json({ error: message, category: 'internal' }, { status: 500 });
  }
}
