import { NextRequest, NextResponse } from 'next/server';
import { captureController } from '@/capture/controller';
import { CaptureOptions } from '@/capture/types';

export async function POST(request: NextRequest) {
  try {
    const body: CaptureOptions = await request.json();

    const validation = captureController.validateOptions(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const result = await captureController.captureScreenshot(body);

    if (result.status === 'failed') {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
