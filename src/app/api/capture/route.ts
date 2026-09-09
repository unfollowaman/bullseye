import { NextRequest, NextResponse } from 'next/server';
import { captureController } from '@/capture/controller';
import { UnifiedCaptureConfig } from '@/capture/types';

export async function POST(request: NextRequest) {
  try {
    let body: UnifiedCaptureConfig;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body provided in request', category: 'validation' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a valid JSON object', category: 'validation' },
        { status: 400 }
      );
    }

    const validation = captureController.validateConfig(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join('; '), errors: validation.errors, category: 'validation' },
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
      { error: errorMessage, category: 'internal' },
      { status: 500 }
    );
  }
}
