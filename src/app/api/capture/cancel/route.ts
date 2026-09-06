import { NextRequest, NextResponse } from 'next/server';
import { captureController } from '@/capture/controller';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobId = body.jobId || body.id;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required for cancellation' }, { status: 400 });
    }

    const cancelled = await captureController.cancelJob(jobId, body.reason || 'Cancelled by user');
    if (!cancelled) {
      return NextResponse.json(
        { error: `Job '${jobId}' not found or cannot be cancelled` },
        { status: 404 }
      );
    }

    const job = captureController.getJob(jobId);
    return NextResponse.json({ message: 'Job cancelled successfully', job }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
