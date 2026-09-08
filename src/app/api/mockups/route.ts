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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
