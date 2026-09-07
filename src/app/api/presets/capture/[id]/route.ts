import { NextRequest, NextResponse } from 'next/server';
import { presetService } from '@/presets/service';
import { UpdateCapturePresetInput } from '@/presets/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const preset = presetService.getCapturePresetById(id);

    if (!preset) {
      return NextResponse.json({ error: `Capture preset '${id}' not found.` }, { status: 404 });
    }

    return NextResponse.json(preset);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch capture preset';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateCapturePresetInput = await req.json();

    const result = presetService.updateCapturePreset(id, body);

    if (result.error) {
      const status = result.error.includes('not found') ? 404 : 400;
      return NextResponse.json({ error: result.error, errors: result.validation.errors }, { status });
    }

    if (!result.validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: result.validation.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(result.preset);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update capture preset';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = presetService.deleteCapturePreset(id);

    if (!result.success) {
      const status = result.error?.includes('cannot be deleted') ? 400 : 404;
      return NextResponse.json({ error: result.error || 'Delete failed' }, { status });
    }

    return NextResponse.json({ success: true, message: `Preset '${id}' deleted successfully.` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete capture preset';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
