import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '@/recipes/service';
import { projectService } from '@/projects/service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const project = projectService.getProject(params.id);
    if (!project) {
      return NextResponse.json({ error: `Project '${params.id}' not found` }, { status: 404 });
    }

    const recipes = recipeService.listRecipes(params.id);
    return NextResponse.json({ recipes }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project recipes';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
