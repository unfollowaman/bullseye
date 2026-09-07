import { NextResponse } from 'next/server';
import { presetService } from '@/presets/service';

export async function GET() {
  try {
    const devices = presetService.getAllDevicePresets();
    return NextResponse.json(devices);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch device presets';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
