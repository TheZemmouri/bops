import { NextRequest, NextResponse } from 'next/server';
import { listJobs, createJob } from '@/lib/server/jobs';

/**
 * Installer.report Jobs API
 * 
 * Handles job creation, listing, and management for the agency pipeline.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      status: searchParams.get('status') as any,
      vertical: searchParams.get('vertical') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
    };
    
    const result = await listJobs(params);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[jobs] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list jobs', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.clientName || !body.projectTitle || !body.projectType || !body.vertical) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, projectTitle, projectType, vertical' },
        { status: 400 }
      );
    }
    
    if (!body.brief || !body.brief.goals || !body.brief.deliverables) {
      return NextResponse.json(
        { error: 'Brief must include goals and deliverables' },
        { status: 400 }
      );
    }
    
    const job = await createJob({
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      projectTitle: body.projectTitle,
      projectType: body.projectType,
      vertical: body.vertical,
      brief: body.brief,
      budgetCents: body.budgetCents,
      workspaceId: body.workspaceId,
    });
    
    return NextResponse.json({
      success: true,
      job,
    }, { status: 201 });
  } catch (error) {
    console.error('[jobs] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create job', message: (error as Error).message },
      { status: 500 }
    );
  }
}
