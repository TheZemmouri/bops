/**
 * Tests for Installer.report Product Scoring Engine
 */

import {
  calculateQualityScore,
  calculateSentimentScore,
  calculateValueScore,
  calculateProductScore,
  scoreWindowTintProduct,
  getScoringFormulaInfo,
} from '../server/scoring';
import type { ProductMetrics, ProductSentiment, ProductPricing } from '../server/scoring';

describe('Product Scoring Engine', () => {
  describe('calculateQualityScore', () => {
    it('should calculate quality score for window tint', () => {
      const metrics: ProductMetrics = {
        ir_rejection: 90,  // 90%
        tser: 85,          // 85%
        uv_protection: 99, // 99%
        optical_clarity: 95,
        install_handling: 80,
        color_stability: 90,
      };
      
      const score = calculateQualityScore(metrics, 'window_tint_auto');
      
      // Should be weighted average: IR(28%) + TSER(22%) + UV(15%) + clarity(12%) + handling(13%) + color(10%)
      const expected = 
        90 * 0.28 +
        85 * 0.22 +
        99 * 0.15 +
        95 * 0.12 +
        80 * 0.13 +
        90 * 0.10;
      
      expect(score).toBeCloseTo(expected, 1);
      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThan(95);
    });
    
    it('should handle missing metrics gracefully', () => {
      const metrics: ProductMetrics = {
        ir_rejection: 90,
        tser: 85,
        // Missing other metrics
      };
      
      const score = calculateQualityScore(metrics, 'window_tint_auto');
      
      // Should still calculate with available metrics
      expect(score).toBeGreaterThan(0);
    });
    
    it('should throw for unknown vertical', () => {
      const metrics: ProductMetrics = { test: 100 };
      
      expect(() => {
        calculateQualityScore(metrics, 'unknown_vertical');
      }).toThrow('Unknown vertical');
    });
  });
  
  describe('calculateSentimentScore', () => {
    it('should return overall sentiment', () => {
      const sentiment: ProductSentiment = {
        installerReviews: 85,
        fieldFeedback: 80,
        overall: 82,
      };
      
      const score = calculateSentimentScore(sentiment);
      
      expect(score).toBe(82);
    });
  });
  
  describe('calculateValueScore', () => {
    it('should calculate value as quality/price ratio', () => {
      const qualityScore = 90;
      const pricing: ProductPricing = {
        msrpCents: 850,
        normalizedPrice: 50, // Mid-range price
      };
      
      const valueScore = calculateValueScore(qualityScore, pricing);
      
      // High quality + mid price = good value (capped at 100)
      expect(valueScore).toBeGreaterThanOrEqual(100);
      expect(valueScore).toBeLessThanOrEqual(100);
    });
    
    it('should handle zero price gracefully', () => {
      const qualityScore = 80;
      const pricing: ProductPricing = {
        msrpCents: 0,
        normalizedPrice: 0,
      };
      
      const valueScore = calculateValueScore(qualityScore, pricing);
      
      expect(valueScore).toBe(100); // Max value when price is zero
    });
  });
  
  describe('calculateProductScore', () => {
    it('should calculate complete product score', () => {
      const metrics: ProductMetrics = {
        ir_rejection: 90,
        tser: 85,
        uv_protection: 99,
        optical_clarity: 95,
        install_handling: 80,
        color_stability: 90,
      };
      
      const sentiment: ProductSentiment = {
        installerReviews: 85,
        overall: 85,
      };
      
      const pricing: ProductPricing = {
        msrpCents: 850,
        normalizedPrice: 50,
      };
      
      const score = calculateProductScore(
        'test-product-1',
        'window_tint_auto',
        metrics,
        sentiment,
        pricing
      );
      
      expect(score.productId).toBe('test-product-1');
      expect(score.vertical).toBe('window_tint_auto');
      expect(score.overallScore).toBeGreaterThan(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.stars).toBeGreaterThan(0);
      expect(score.stars).toBeLessThanOrEqual(5);
      expect(score.breakdown.quality.weight).toBe(0.40);
      expect(score.breakdown.sentiment.weight).toBe(0.35);
      expect(score.breakdown.value.weight).toBe(0.25);
    });
    
    it('should convert score to stars correctly', () => {
      const metrics: ProductMetrics = {
        ir_rejection: 100,
        tser: 100,
        uv_protection: 100,
        optical_clarity: 100,
        install_handling: 100,
        color_stability: 100,
      };
      
      const sentiment: ProductSentiment = {
        overall: 100,
      };
      
      const pricing: ProductPricing = {
        msrpCents: 500,
        normalizedPrice: 20, // Very cheap
      };
      
      const score = calculateProductScore(
        'perfect-product',
        'window_tint_auto',
        metrics,
        sentiment,
        pricing
      );
      
      // Perfect score should be close to 5 stars
      expect(score.stars).toBeGreaterThan(4.5);
    });
  });
  
  describe('scoreWindowTintProduct', () => {
    it('should score a complete window tint product', () => {
      const score = scoreWindowTintProduct({
        productId: 'llumar-ctx-35',
        vltShade: '35%',
        irRejection: 92,
        tser: 88,
        uvProtection: 99,
        opticalClarity: 95,
        installHandling: 85,
        colorStability: 90,
        installerReviews: 87,
        msrpCents: 895,
      });
      
      expect(score.productId).toBe('llumar-ctx-35');
      expect(score.vertical).toBe('window_tint_auto');
      expect(score.overallScore).toBeGreaterThan(80);
      expect(score.stars).toBeGreaterThan(4);
      expect(score.metrics.ir_rejection).toBe(92);
    });
    
    it('should handle economy product with lower scores', () => {
      const score = scoreWindowTintProduct({
        productId: 'economy-tint-35',
        vltShade: '35%',
        irRejection: 45,
        tser: 50,
        uvProtection: 99,
        opticalClarity: 60,
        installHandling: 55,
        colorStability: 70,
        installerReviews: 65,
        msrpCents: 450,
      });
      
      expect(score.overallScore).toBeLessThan(70);
      expect(score.valueScore).toBeGreaterThanOrEqual(score.qualityScore); // Better or equal value than quality
    });
  });
  
  describe('getScoringFormulaInfo', () => {
    it('should return formula info for window tint', () => {
      const info = getScoringFormulaInfo('window_tint_auto');
      
      expect(info.vertical).toBe('Automotive Window Tint');
      expect(info.formula).toEqual({
        quality: 0.40,
        sentiment: 0.35,
        value: 0.25,
      });
      expect(info.qualityMetrics).toBeDefined();
      expect(info.qualityMetrics?.ir_rejection.weight).toBe(0.28);
    });
    
    it('should return formula info for PPF', () => {
      const info = getScoringFormulaInfo('ppf');
      
      expect(info.vertical).toBe('Paint Protection Film (PPF)');
      expect(info.formula).toEqual({
        quality: 0.45,
        sentiment: 0.35,
        value: 0.20,
      });
    });
  });
  
  describe('Formula weight validation', () => {
    it('should have weights that sum to 1.0 for all verticals', () => {
      const verticals = [
        'window_tint_auto',
        'window_tint_residential',
        'window_tint_commercial',
        'ppf',
        'windshield_film',
        'vinyl_wrap',
        'ceramic_coating',
        'detailing',
      ];
      
      for (const vertical of verticals) {
        const info = getScoringFormulaInfo(vertical);
        const sum = info.formula!.quality + info.formula!.sentiment + info.formula!.value;
        expect(sum).toBeCloseTo(1.0, 5);
      }
    });
    
    it('should have quality metric weights that sum to 1.0', () => {
      const info = getScoringFormulaInfo('window_tint_auto');
      const metrics = info.qualityMetrics!;
      
      const sum = Object.values(metrics).reduce((acc, m) => acc + m.weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });
});
