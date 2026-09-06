import { NextRequest, NextResponse } from 'next/server';
import { captureController } from '@/capture/controller';
import { UnifiedCaptureConfig } from '@/capture/types';

export async function POST(request: NextRequest) {
  try {
    const body: UnifiedCaptureConfig = await request.json();

    const validation = captureController.validateConfig(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join('; '), errors: validation.errors },
        { status: 400 }
      );
    }

    const jobResult = await captureController.executeJob(body);

    if (jobResult.status === 'failed') {
      return NextResponse.json(jobResult, { status: 500 });
    }

    // Return 200 OK for completed or partial completion
    return NextResponse.json(jobResult, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
