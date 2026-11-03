import "server-only";

/**
 * Installer.report Product Database Seeder
 * 
 * Seeds the product database with publicly known products
 * Marks all as unverified specs (user should verify before publishing)
 */

export interface ProductRecord {
  id: string;
  manufacturer: string;
  series: string;
  vertical: string;
  vltShade?: string;
  specs: Record<string, number>;
  msrpCents: number;
  verified: boolean;
  source: string;
  notes: string;
}

/**
 * Known window tint products (publicly available specs)
 * Marked as unverified - user should verify before publishing
 */
export const WINDOW_TINT_PRODUCTS: ProductRecord[] = [
  {
    id: "3m-crystalline-70",
    manufacturer: "3M",
    series: "Crystalline",
    vertical: "window_tint_auto",
    vltShade: "70%",
    specs: {
      ir_rejection: 97,
      tser: 60,
      uv_protection: 99.9,
      optical_clarity: 95,
      install_handling: 85,
      color_stability: 90,
    },
    msrpCents: 1250,
    verified: false,
    source: "3M product literature",
    notes: "UNVERIFIED SPECS - Crystalline series flagship product. Premium ceramic tint.",
  },
  {
    id: "llumar-ctx-35",
    manufacturer: "Llumar",
    series: "CTX Ceramic",
    vertical: "window_tint_auto",
    vltShade: "35%",
    specs: {
      ir_rejection: 92,
      tser: 65,
      uv_protection: 99,
      optical_clarity: 90,
      install_handling: 88,
      color_stability: 92,
    },
    msrpCents: 895,
    verified: false,
    source: "Llumar dealer materials",
    notes: "UNVERIFIED SPECS - CTX ceramic series. Popular mid-range option.",
  },
  {
    id: "suntek-cxp-20",
    manufacturer: "SunTek",
    series: "CXP",
    vertical: "window_tint_auto",
    vltShade: "20%",
    specs: {
      ir_rejection: 88,
      tser: 62,
      uv_protection: 99,
      optical_clarity: 85,
      install_handling: 82,
      color_stability: 88,
    },
    msrpCents: 795,
    verified: false,
    source: "SunTek spec sheets",
    notes: "UNVERIFIED SPECS - CXP carbon ceramic. Good performance-to-price ratio.",
  },
  {
    id: "xpel-prime-xr-plus-50",
    manufacturer: "XPEL",
    series: "Prime XR Plus",
    vertical: "window_tint_auto",
    vltShade: "50%",
    specs: {
      ir_rejection: 88,
      tser: 64,
      uv_protection: 99,
      optical_clarity: 92,
      install_handling: 90,
      color_stability: 90,
    },
    msrpCents: 950,
    verified: false,
    source: "XPEL product catalog",
    notes: "UNVERIFIED SPECS - Prime XR Plus ceramic. Excellent clarity.",
  },
  {
    id: "johnson-formula-one-pinnacle-35",
    manufacturer: "Johnson Window Films",
    series: "Formula One Pinnacle",
    vertical: "window_tint_auto",
    vltShade: "35%",
    specs: {
      ir_rejection: 90,
      tser: 66,
      uv_protection: 99.9,
      optical_clarity: 88,
      install_handling: 85,
      color_stability: 87,
    },
    msrpCents: 850,
    verified: false,
    source: "Johnson dealer network",
    notes: "UNVERIFIED SPECS - Formula One flagship. Strong IR performance.",
  },
];

/**
 * Known PPF products
 */
export const PPF_PRODUCTS: ProductRecord[] = [
  {
    id: "xpel-ultimate-plus",
    manufacturer: "XPEL",
    series: "Ultimate Plus",
    vertical: "ppf",
    specs: {
      self_healing: 95,
      clarity: 98,
      yellowing_resistance: 95,
      stain_resistance: 92,
      install_ease: 88,
      edge_adhesion: 90,
    },
    msrpCents: 2500, // per piece
    verified: false,
    source: "XPEL product specs",
    notes: "UNVERIFIED SPECS - Premium self-healing PPF. 10-year warranty.",
  },
  {
    id: "3m-scotchgard-pro",
    manufacturer: "3M",
    series: "Scotchgard Pro",
    vertical: "ppf",
    specs: {
      self_healing: 90,
      clarity: 95,
      yellowing_resistance: 93,
      stain_resistance: 95,
      install_ease: 85,
      edge_adhesion: 88,
    },
    msrpCents: 2200,
    verified: false,
    source: "3M dealer materials",
    notes: "UNVERIFIED SPECS - Proven reliability. Strong stain resistance.",
  },
  {
    id: "suntek-ultra",
    manufacturer: "SunTek",
    series: "Ultra",
    vertical: "ppf",
    specs: {
      self_healing: 92,
      clarity: 96,
      yellowing_resistance: 92,
      stain_resistance: 90,
      install_ease: 90,
      edge_adhesion: 92,
    },
    msrpCents: 2100,
    verified: false,
    source: "SunTek spec sheets",
    notes: "UNVERIFIED SPECS - Excellent install characteristics. Good value.",
  },
];

/**
 * Known vinyl wrap products
 */
export const VINYL_WRAP_PRODUCTS: ProductRecord[] = [
  {
    id: "3m-2080-gloss-black",
    manufacturer: "3M",
    series: "2080 Series",
    vertical: "vinyl_wrap",
    specs: {
      conformability: 92,
      color_accuracy: 95,
      durability: 90,
      glue_quality: 93,
      air_release: 95,
    },
    msrpCents: 650, // per yard
    verified: false,
    source: "3M wrap film catalog",
    notes: "UNVERIFIED SPECS - Industry standard. Excellent air release.",
  },
  {
    id: "avery-sw900-satin-grey",
    manufacturer: "Avery Dennison",
    series: "Supreme Wrapping Film",
    vertical: "vinyl_wrap",
    specs: {
      conformability: 95,
      color_accuracy: 93,
      durability: 92,
      glue_quality: 90,
      air_release: 92,
    },
    msrpCents: 680,
    verified: false,
    source: "Avery product literature",
    notes: "UNVERIFIED SPECS - Superior conformability. Great for curves.",
  },
];

/**
 * Get all seed products
 */
export function getAllSeedProducts(): ProductRecord[] {
  return [
    ...WINDOW_TINT_PRODUCTS,
    ...PPF_PRODUCTS,
    ...VINYL_WRAP_PRODUCTS,
  ];
}

/**
 * Get seed products by vertical
 */
export function getSeedProductsByVertical(vertical: string): ProductRecord[] {
  return getAllSeedProducts().filter(p => p.vertical === vertical);
}

/**
 * Seed products to database
 * TODO: Implement actual database insert when products table is added
 */
export async function seedProducts(): Promise<{ seeded: number; skipped: number }> {
  const products = getAllSeedProducts();
  
  console.log(`[product-seeder] Seeding ${products.length} products...`);
  console.log('[product-seeder] WARNING: All products marked as UNVERIFIED');
  console.log('[product-seeder] Product database table not yet created - products logged only');
  
  // Log products for now
  for (const product of products) {
    console.log(`[product-seeder] ${product.id}: ${product.manufacturer} ${product.series}`);
  }
  
  // TODO: When products table exists, insert here
  // await db.query('INSERT INTO products ...');
  
  return { seeded: products.length, skipped: 0 };
}

/**
 * Get product count by vertical
 */
export function getProductCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const product of getAllSeedProducts()) {
    counts[product.vertical] = (counts[product.vertical] || 0) + 1;
  }
  
  return counts;
}
