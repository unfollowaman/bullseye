import { NextResponse } from 'next/server';
import { visualQAService } from '@/visual-qa/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = visualQAService.validateConfig(body);
    return NextResponse.json(validation, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { valid: false, errors: [(err as Error).message], warnings: [] },
      { status: 400 }
    );
  }
}
