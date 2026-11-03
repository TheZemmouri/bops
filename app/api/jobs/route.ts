import { NextRequest, NextResponse } from 'next/server';

/**
 * Installer.report Jobs API
 * 
 * Handles job creation, listing, and management for the agency pipeline.
 * 
 * TODO: Implement actual job management using lib/job-types.ts and database
 */

export async function GET(request: NextRequest) {
  // TODO: List jobs for current user/workspace
  // Query params: status, vertical, limit, offset
  
  return NextResponse.json({
    jobs: [],
    total: 0,
    message: 'Jobs API not yet implemented',
  });
}

export async function POST(request: NextRequest) {
  // TODO: Create new job
  // Body: clientName, projectTitle, projectType, vertical, brief, etc.
  
  const body = await request.json();
  
  return NextResponse.json({
    success: false,
    message: 'Job creation not yet implemented',
    received: body,
  }, { status: 501 });
}
