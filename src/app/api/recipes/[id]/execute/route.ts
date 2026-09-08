import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '@/recipes/service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let overrideOptions;
    const text = await req.text();
    if (text && text.trim()) {
      try {
        overrideOptions = JSON.parse(text);
      } catch {
        // Ignore JSON parse errors for optional overrides
      }
    }

    const result = await recipeService.executeRecipe(id, overrideOptions);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to execute recipe';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      {
        status: 'failed',
        errors: [message],
      },
      { status }
    );
  }
}
