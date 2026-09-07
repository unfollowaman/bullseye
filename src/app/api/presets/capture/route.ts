import { NextRequest, NextResponse } from 'next/server';
import { presetService } from '@/presets/service';
import { CreateCapturePresetInput } from '@/presets/types';

export async function GET() {
  try {
    const presets = presetService.getAllCapturePresets();
    return NextResponse.json(presets);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch capture presets';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateCapturePresetInput = await req.json();
    const result = presetService.createCapturePreset(body);

    if (!result.validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: result.validation.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(result.preset, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create capture preset';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
