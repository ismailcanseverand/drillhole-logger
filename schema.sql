-- ====================================================================
-- KALE MADEN DRILLHOLE MANAGER - SUPABASE SCHEMA INITIALIZATION SCRIPT
-- ====================================================================
-- Copy and paste this script directly into the Supabase SQL Editor
-- to create all logging tables and establish references.
-- ====================================================================

-- 1. COLLARS TABLE (Drillhole Metadata)
CREATE TABLE IF NOT EXISTS collars (
  hole_id TEXT PRIMARY KEY,
  easting DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  northing DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  elevation DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  total_depth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  dip DOUBLE PRECISION NOT NULL DEFAULT -90.0,
  azimuth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  date_started TEXT DEFAULT '',
  date_completed TEXT DEFAULT '',
  logger TEXT DEFAULT '',
  status TEXT DEFAULT 'Planned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SURVEYS TABLE (Downhole Surveys)
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  hole_id TEXT REFERENCES collars(hole_id) ON DELETE CASCADE,
  depth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  dip DOUBLE PRECISION NOT NULL DEFAULT -90.0,
  azimuth DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- 3. LITHOLOGIES TABLE (Geology Stratigraphy logs)
CREATE TABLE IF NOT EXISTS lithologies (
  id TEXT PRIMARY KEY,
  hole_id TEXT REFERENCES collars(hole_id) ON DELETE CASCADE,
  from_depth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  to_depth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  rock_code TEXT NOT NULL DEFAULT 'BAS',
  alteration TEXT DEFAULT '',
  mineralization TEXT DEFAULT '',
  description TEXT DEFAULT ''
);

-- 4. GEOTECHS TABLE (Core recovery logs TCR/RQD)
CREATE TABLE IF NOT EXISTS geotechs (
  id TEXT PRIMARY KEY,
  hole_id TEXT REFERENCES collars(hole_id) ON DELETE CASCADE,
  from_depth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  to_depth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  drilled_length DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  recovered_length DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  solid_pieces_over_10cm DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  tcr_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  rqd_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- 5. ASSAYS TABLE (Clay Analysis grades)
CREATE TABLE IF NOT EXISTS assays (
  id TEXT PRIMARY KEY,
  hole_id TEXT REFERENCES collars(hole_id) ON DELETE CASCADE,
  sample_id TEXT NOT NULL,
  from_depth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  to_depth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  sample_type TEXT DEFAULT 'Core',
  al2o3 DOUBLE PRECISION DEFAULT 0.0,
  fe2o3 DOUBLE PRECISION DEFAULT 0.0,
  sio2 DOUBLE PRECISION DEFAULT 0.0,
  tio2 DOUBLE PRECISION DEFAULT 0.0,
  na2o_k2o DOUBLE PRECISION DEFAULT 0.0,
  loi DOUBLE PRECISION DEFAULT 0.0
);

-- Add database performance index mappings for fast drillhole lookups
CREATE INDEX IF NOT EXISTS idx_surveys_hole_id ON surveys(hole_id);
CREATE INDEX IF NOT EXISTS idx_lithologies_hole_id ON lithologies(hole_id);
CREATE INDEX IF NOT EXISTS idx_geotechs_hole_id ON geotechs(hole_id);
CREATE INDEX IF NOT EXISTS idx_assays_hole_id ON assays(hole_id);

-- 6. DISABLE ROW LEVEL SECURITY (RLS) FOR ANONYMOUS APP ACCESS
-- Since this app uses the public anon key for direct client database sync,
-- we must disable RLS on these tables so that edits can be saved.
ALTER TABLE collars DISABLE ROW LEVEL SECURITY;
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE lithologies DISABLE ROW LEVEL SECURITY;
ALTER TABLE geotechs DISABLE ROW LEVEL SECURITY;
ALTER TABLE assays DISABLE ROW LEVEL SECURITY;
