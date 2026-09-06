import { NextResponse } from 'next/server';
import { config } from '@/config';
import { captureController } from '@/capture/controller';

export async function GET() {
  const captureStatus = await captureController.getStatus();

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.env,
    appUrl: config.appUrl,
    captureController: captureStatus,
  });
}
