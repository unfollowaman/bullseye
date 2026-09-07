import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '@/recipes/service';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const duplicated = recipeService.duplicateRecipe(id);
    return NextResponse.json({ success: true, recipe: duplicated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to duplicate recipe';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
