import { NextRequest, NextResponse } from 'next/server';
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
    return NextResponse.json({ project }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const updated = projectService.updateProject(params.id, body);
    return NextResponse.json({ success: true, project: updated }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const success = projectService.deleteProject(params.id);
    if (!success) {
      return NextResponse.json({ error: `Project '${params.id}' not found` }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
