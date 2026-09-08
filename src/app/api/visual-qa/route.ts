import { NextResponse } from 'next/server';
import { visualQAService } from '@/visual-qa/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await visualQAService.compare(body);

    if (result.status === 'error' && result.error?.startsWith('Invalid comparison configuration:')) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to execute Visual QA comparison.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : undefined;
    const outcome = searchParams.get('outcome') || undefined;
    const baselineCaptureId = searchParams.get('baselineCaptureId') || undefined;
    const currentCaptureId = searchParams.get('currentCaptureId') || undefined;

    const results = visualQAService.listComparisons({
      limit,
      offset,
      outcome,
      baselineCaptureId,
      currentCaptureId,
    });

    return NextResponse.json(results, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to list Visual QA comparisons.' },
      { status: 500 }
    );
  }
}
