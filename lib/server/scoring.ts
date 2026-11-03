import "server-only";
import verticalTemplates from "@/lib/vertical-templates.json";

/**
 * Installer.report Product Scoring Engine
 * 
 * Evaluates product scores using formulas from vertical-templates.json.
 */

export interface ProductMetrics {
  [metricName: string]: number; // 0-100 normalized scores
}

export interface ProductSentiment {
  installerReviews?: number; // 0-100
  fieldFeedback?: number;    // 0-100
  warrantyClaims?: number;   // 0-100 (inverse)
  socialMentions?: number;   // 0-100
  overall: number;           // 0-100 weighted average
}

export interface ProductPricing {
  msrpCents: number;
  normalizedPrice: number; // 0-100 (relative to category)
}

export interface ProductScore {
  productId: string;
  vertical: string;
  overallScore: number;     // 0-100
  stars: number;            // 0-5
  qualityScore: number;     // 0-100
  sentimentScore: number;   // 0-100
  valueScore: number;       // 0-100
  metrics: ProductMetrics;
  breakdown: {
    quality: { weight: number; score: number };
    sentiment: { weight: number; score: number };
    value: { weight: number; score: number };
  };
}

/**
 * Get vertical configuration
 */
export function getVerticalConfig(vertical: string) {
  const config = verticalTemplates.verticals[vertical as keyof typeof verticalTemplates.verticals];
  if (!config) {
    throw new Error(`Unknown vertical: ${vertical}`);
  }
  return config;
}

/**
 * Normalize a metric value to 0-100 scale
 */
function normalizeMetric(value: number, higherIsBetter: boolean, min = 0, max = 100): number {
  const normalized = ((value - min) / (max - min)) * 100;
  return higherIsBetter ? Math.max(0, Math.min(100, normalized)) : Math.max(0, Math.min(100, 100 - normalized));
}

/**
 * Calculate quality score from metrics
 */
export function calculateQualityScore(
  metrics: ProductMetrics,
  vertical: string
): number {
  const config = getVerticalConfig(vertical);
  
  if (!config.scoring?.quality_metrics) {
    throw new Error(`No quality metrics defined for vertical: ${vertical}`);
  }
  
  const qualityMetrics = config.scoring.quality_metrics;
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [metricName, metricConfig] of Object.entries(qualityMetrics)) {
    const value = metrics[metricName];
    if (value === undefined) continue;
    
    // Metrics are already normalized to 0-100 in ProductMetrics
    totalScore += value * metricConfig.weight;
    totalWeight += metricConfig.weight;
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Calculate sentiment score from sources
 */
export function calculateSentimentScore(sentiment: ProductSentiment): number {
  return sentiment.overall;
}

/**
 * Calculate value score (performance vs. price)
 */
export function calculateValueScore(
  qualityScore: number,
  pricing: ProductPricing
): number {
  // Value = Quality / Normalized Price
  // If price is low and quality is high, value is high
  // Normalize to 0-100 scale
  
  if (pricing.normalizedPrice === 0) return 100;
  
  const rawValue = (qualityScore / pricing.normalizedPrice) * 100;
  return Math.max(0, Math.min(100, rawValue));
}

/**
 * Calculate overall IR product score
 */
export function calculateProductScore(
  productId: string,
  vertical: string,
  metrics: ProductMetrics,
  sentiment: ProductSentiment,
  pricing: ProductPricing
): ProductScore {
  const config = getVerticalConfig(vertical);
  
  if (!config.scoring?.formula) {
    throw new Error(`No scoring formula defined for vertical: ${vertical}`);
  }
  
  const formula = config.scoring.formula;
  
  // Calculate component scores
  const qualityScore = calculateQualityScore(metrics, vertical);
  const sentimentScore = calculateSentimentScore(sentiment);
  const valueScore = calculateValueScore(qualityScore, pricing);
  
  // Apply formula weights
  const overallScore =
    qualityScore * formula.quality +
    sentimentScore * formula.sentiment +
    valueScore * formula.value;
  
  // Convert to 5-star rating
  const stars = (overallScore / 100) * 5;
  
  return {
    productId,
    vertical,
    overallScore: Math.round(overallScore),
    stars: Math.round(stars * 10) / 10, // Round to 1 decimal
    qualityScore: Math.round(qualityScore),
    sentimentScore: Math.round(sentimentScore),
    valueScore: Math.round(valueScore),
    metrics,
    breakdown: {
      quality: { weight: formula.quality, score: qualityScore },
      sentiment: { weight: formula.sentiment, score: sentimentScore },
      value: { weight: formula.value, score: valueScore },
    },
  };
}

/**
 * Batch score multiple products
 */
export function batchScoreProducts(
  products: Array<{
    productId: string;
    vertical: string;
    metrics: ProductMetrics;
    sentiment: ProductSentiment;
    pricing: ProductPricing;
  }>
): ProductScore[] {
  return products.map(product =>
    calculateProductScore(
      product.productId,
      product.vertical,
      product.metrics,
      product.sentiment,
      product.pricing
    )
  );
}

/**
 * Get vertical scoring formula info
 */
export function getScoringFormulaInfo(vertical: string) {
  const config = getVerticalConfig(vertical);
  
  return {
    vertical: config.name,
    formula: config.scoring?.formula,
    qualityMetrics: config.scoring?.quality_metrics,
    sentimentSources: config.scoring?.sentiment_sources,
  };
}

/**
 * Example: Score a window tint product
 */
export function scoreWindowTintProduct(params: {
  productId: string;
  vltShade: string;
  irRejection: number;      // %
  tser: number;             // %
  uvProtection: number;     // %
  opticalClarity: number;   // 0-100 subjective
  installHandling: number;  // 0-100 subjective
  colorStability: number;   // 0-100 subjective
  installerReviews: number; // 0-100
  msrpCents: number;
}): ProductScore {
  const metrics: ProductMetrics = {
    ir_rejection: params.irRejection,
    tser: params.tser,
    uv_protection: params.uvProtection,
    optical_clarity: params.opticalClarity,
    install_handling: params.installHandling,
    color_stability: params.colorStability,
  };
  
  const sentiment: ProductSentiment = {
    installerReviews: params.installerReviews,
    overall: params.installerReviews, // Simplified for now
  };
  
  // Normalize price (assume $5-15 per sqft range)
  const normalizedPrice = normalizeMetric(params.msrpCents / 100, false, 5, 15);
  
  const pricing: ProductPricing = {
    msrpCents: params.msrpCents,
    normalizedPrice,
  };
  
  return calculateProductScore(
    params.productId,
    "window_tint_auto",
    metrics,
    sentiment,
    pricing
  );
}
