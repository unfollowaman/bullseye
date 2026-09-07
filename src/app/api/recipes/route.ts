import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '@/recipes/service';

export async function GET() {
  try {
    const recipes = recipeService.listRecipes();
    return NextResponse.json({ success: true, recipes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve recipes';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Request body is empty' },
        { status: 400 }
      );
    }
    const body = JSON.parse(text);
    const recipe = recipeService.createRecipe(body);
    return NextResponse.json({ success: true, recipe }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create recipe';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
