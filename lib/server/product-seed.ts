import "server-only";
import { getAllSeedProducts } from "./product-seeder";
import { query } from "./db";

/**
 * Seed products into database
 * Inserts all products from product-seeder.ts into agency_products table
 */
export async function seedProductsToDatabase(): Promise<{ seeded: number; skipped: number }> {
  const products = getAllSeedProducts();
  
  let seeded = 0;
  let skipped = 0;
  
  console.log(`[product-seed] Seeding ${products.length} products to database...`);
  
  for (const product of products) {
    try {
      // Check if product already exists
      const existing = await query(
        'SELECT id FROM bops.agency_products WHERE id = $1',
        [product.id]
      );
      
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert product
      await query(
        `INSERT INTO bops.agency_products (
          id, manufacturer, series, vertical, vlt_shade,
          specs, msrp_cents, verified, source, notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          product.id,
          product.manufacturer,
          product.series,
          product.vertical,
          product.vltShade || null,
          JSON.stringify(product.specs),
          product.msrpCents,
          product.verified,
          product.source,
          product.notes,
        ]
      );
      
      seeded++;
      console.log(`[product-seed] Seeded: ${product.id} - ${product.manufacturer} ${product.series}`);
    } catch (error) {
      console.error(`[product-seed] Failed to seed ${product.id}:`, error);
    }
  }
  
  console.log(`[product-seed] Complete: ${seeded} seeded, ${skipped} skipped`);
  
  return { seeded, skipped };
}

/**
 * Get product by ID from database
 */
export async function getProduct(productId: string) {
  const result = await query(
    'SELECT * FROM bops.agency_products WHERE id = $1',
    [productId]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0] as any;
  return {
    id: row.id,
    manufacturer: row.manufacturer,
    series: row.series,
    vertical: row.vertical,
    vltShade: row.vlt_shade,
    specs: row.specs,
    msrpCents: row.msrp_cents,
    verified: row.verified,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    source: row.source,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List products by vertical
 */
export async function listProducts(vertical?: string) {
  const whereClause = vertical ? 'WHERE vertical = $1' : '';
  const params = vertical ? [vertical] : [];
  
  const result = await query(
    `SELECT * FROM bops.agency_products ${whereClause} ORDER BY manufacturer, series`,
    params
  );
  
  return result.rows.map((row: any) => ({
    id: row.id,
    manufacturer: row.manufacturer,
    series: row.series,
    vertical: row.vertical,
    vltShade: row.vlt_shade,
    specs: row.specs,
    msrpCents: row.msrp_cents,
    verified: row.verified,
    source: row.source,
    notes: row.notes,
  }));
}
