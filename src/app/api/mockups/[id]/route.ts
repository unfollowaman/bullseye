import { mockupService } from '@/mockup/service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mockup = mockupService.getMockupById(id);

    if (!mockup) {
      return NextResponse.json({ error: `Mockup not found for ID '${id}'` }, { status: 404 });
    }

    return NextResponse.json(mockup, { status: 200 });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Failed to retrieve mockup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = mockupService.deleteMockup(id);

    if (!deleted) {
      return NextResponse.json({ error: `Mockup not found for ID '${id}'` }, { status: 404 });
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Failed to delete mockup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
