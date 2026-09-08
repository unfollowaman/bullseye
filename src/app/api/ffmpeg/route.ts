import { NextResponse } from 'next/server';
import { checkFFmpegAvailability } from '@/utils/ffmpeg';

export async function GET() {
  const capability = await checkFFmpegAvailability();
  return NextResponse.json(capability, { status: 200 });
}
