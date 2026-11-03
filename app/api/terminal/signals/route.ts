import { NextRequest, NextResponse } from 'next/server';
import { getLatestSignals, aggregateSignals } from '@/lib/server/terminal';
import type { SignalType } from '@/lib/server/terminal';

/**
 * Installer.report Terminal Signals API
 * 
 * Provides real-time market intelligence and industry signals.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signalType = searchParams.get('type') as SignalType | null;
    const vertical = searchParams.get('vertical');
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20;
    
    const signals = await (signalType
      ? aggregateSignals({ type: signalType, vertical: vertical || undefined, limit })
      : getLatestSignals({ vertical: vertical || undefined, limit }));
    
    return NextResponse.json({
      signals,
      timestamp: new Date().toISOString(),
      count: signals.length,
    });
  } catch (error) {
    console.error('[terminal] Signals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signals', message: (error as Error).message },
      { status: 500 }
    );
  }
}
