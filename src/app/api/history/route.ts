import { NextRequest, NextResponse } from 'next/server';
import { captureHistoryService } from '@/history/service';
import { CaptureHistoryFilter } from '@/history/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filter: CaptureHistoryFilter = {
      projectId: searchParams.get('projectId') || undefined,
      recipeId: searchParams.get('recipeId') || undefined,
      status: searchParams.get('status') || undefined,
      captureType: searchParams.get('captureType') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
    };

    const history = captureHistoryService.listHistory(filter);
    return NextResponse.json({ history }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to list capture history';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const record = captureHistoryService.createRecord(body);
    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create history record';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
