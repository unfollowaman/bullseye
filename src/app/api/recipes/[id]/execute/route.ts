import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '@/recipes/service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let overrideOptions;
    try {
      const body = await req.json();
      if (body && typeof body === 'object') {
        overrideOptions = body;
      }
    } catch {
      // Body is optional for execution
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
