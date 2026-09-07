import { NextRequest, NextResponse } from 'next/server';
import { captureHistoryService } from '@/history/service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const record = captureHistoryService.getHistoryRecord(params.id);
    if (!record) {
      return NextResponse.json({ error: `History record '${params.id}' not found` }, { status: 404 });
    }
    return NextResponse.json({ record }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const success = captureHistoryService.deleteHistoryRecord(params.id);
    if (!success) {
      return NextResponse.json({ error: `History record '${params.id}' not found` }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete history record';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
