import { NextRequest, NextResponse } from 'next/server';
import { presetService } from '@/presets/service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let newName: string | undefined;

    try {
      const body = await req.json();
      newName = body.name;
    } catch {
      // Body is optional for duplicate
    }

    const result = presetService.duplicateCapturePreset(id, newName);

    if (result.error) {
      const status = result.error.includes('not found') ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.preset, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to duplicate capture preset';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
