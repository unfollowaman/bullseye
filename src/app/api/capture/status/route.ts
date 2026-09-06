import { NextResponse } from 'next/server';
import { captureController } from '@/capture/controller';

export async function GET() {
  const status = await captureController.getStatus();
  return NextResponse.json(status);
}
