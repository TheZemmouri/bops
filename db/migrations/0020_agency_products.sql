-- Installer.report product database
-- Products from manufacturers with verified/unverified specs
-- Safe to run again

BEGIN;

-- Products: window film, PPF, wrap, coating products with specs
CREATE TABLE IF NOT EXISTS bops.agency_products (
  id              text PRIMARY KEY,
  
  -- Product info
  manufacturer    text NOT NULL,
  series          text NOT NULL,
  vertical        text NOT NULL, -- 'window_tint_auto', 'ppf', 'vinyl_wrap', etc.
  vlt_shade       text, -- '35%', '50%', etc. for window tint
  
  -- Specifications (JSON for flexibility across verticals)
  specs           jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Pricing
  msrp_cents      bigint,
  
  -- Verification
  verified        boolean NOT NULL DEFAULT false,
  verified_by     text, -- User who verified
  verified_at     timestamptz,
  source          text, -- Where specs came from
  notes           text, -- UNVERIFIED or other notes
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_products_manufacturer ON bops.agency_products (manufacturer);
CREATE INDEX IF NOT EXISTS agency_products_vertical ON bops.agency_products (vertical);
CREATE INDEX IF NOT EXISTS agency_products_verified ON bops.agency_products (verified);

INSERT INTO bops.schema_migrations (version) VALUES ('0020_agency_products') ON CONFLICT DO NOTHING;

COMMIT;
