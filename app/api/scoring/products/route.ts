import { NextRequest, NextResponse } from 'next/server';
import {
  calculateProductScore,
  getScoringFormulaInfo,
  scoreWindowTintProduct,
} from '@/lib/server/scoring';
import type { ProductMetrics, ProductSentiment, ProductPricing } from '@/lib/server/scoring';

/**
 * Installer.report Product Scoring API
 * 
 * Provides product scores, rankings, and comparison data.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vertical = searchParams.get('vertical');
    
    if (!vertical) {
      return NextResponse.json(
        { error: 'vertical parameter required' },
        { status: 400 }
      );
    }
    
    // Return scoring formula info for this vertical
    const formulaInfo = getScoringFormulaInfo(vertical);
    
    return NextResponse.json({
      vertical,
      formula: formulaInfo,
      message: 'Product database not yet populated. Use POST to calculate scores.',
    });
  } catch (error) {
    console.error('[scoring] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get scoring info', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.productId || !body.vertical) {
      return NextResponse.json(
        { error: 'productId and vertical required' },
        { status: 400 }
      );
    }
    
    // For window tint products, use specialized scoring
    if (body.vertical === 'window_tint_auto' && body.vltShade) {
      const score = scoreWindowTintProduct({
        productId: body.productId,
        vltShade: body.vltShade,
        irRejection: body.irRejection || 0,
        tser: body.tser || 0,
        uvProtection: body.uvProtection || 0,
        opticalClarity: body.opticalClarity || 50,
        installHandling: body.installHandling || 50,
        colorStability: body.colorStability || 50,
        installerReviews: body.installerReviews || 50,
        msrpCents: body.msrpCents || 850,
      });
      
      return NextResponse.json({
        success: true,
        score,
      });
    }
    
    // Generic scoring
    if (!body.metrics || !body.sentiment || !body.pricing) {
      return NextResponse.json(
        { error: 'metrics, sentiment, and pricing required' },
        { status: 400 }
      );
    }
    
    const metrics = body.metrics as ProductMetrics;
    const sentiment = body.sentiment as ProductSentiment;
    const pricing = body.pricing as ProductPricing;
    
    const score = calculateProductScore(
      body.productId,
      body.vertical,
      metrics,
      sentiment,
      pricing
    );
    
    return NextResponse.json({
      success: true,
      score,
    });
  } catch (error) {
    console.error('[scoring] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate score', message: (error as Error).message },
      { status: 500 }
    );
  }
}
