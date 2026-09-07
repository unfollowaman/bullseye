import { NextRequest, NextResponse } from 'next/server';
import { captureHistoryService } from '@/history/service';
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

    const history = captureHistoryService.listHistory({ projectId: params.id });
    return NextResponse.json({ history }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project history';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
