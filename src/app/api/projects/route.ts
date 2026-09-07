import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/projects/service';

export async function GET() {
  try {
    const projects = projectService.listProjects();
    return NextResponse.json({ projects }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to list projects';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const project = projectService.createProject(body);
    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
