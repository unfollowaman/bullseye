import { NextResponse } from 'next/server';
import { visualQAService } from '@/visual-qa/service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = visualQAService.getComparisonById(id);

    if (!result) {
      return NextResponse.json(
        { error: `Visual QA comparison with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to retrieve comparison result.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = visualQAService.deleteComparison(id);

    if (!success) {
      return NextResponse.json(
        { error: `Visual QA comparison with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to delete comparison result.' },
      { status: 500 }
    );
  }
}
