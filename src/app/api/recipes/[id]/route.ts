import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '@/recipes/service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipe = recipeService.getRecipe(id);
    if (!recipe) {
      return NextResponse.json(
        { success: false, error: `Recipe '${id}' not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, recipe });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve recipe';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const text = await req.text();
    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Request body is empty' },
        { status: 400 }
      );
    }
    const body = JSON.parse(text);
    const updated = recipeService.updateRecipe(id, body);
    return NextResponse.json({ success: true, recipe: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update recipe';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = recipeService.deleteRecipe(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Recipe '${id}' not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete recipe';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
