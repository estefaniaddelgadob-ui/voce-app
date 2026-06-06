-- ─────────────────────────────────────────────────────────────────────────────
-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop old audiences table and recreate with new schema
--    WARNING: this deletes any existing audience data.
DROP TABLE IF EXISTS audiences CASCADE;

CREATE TABLE audiences (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  age_range   TEXT,
  location    TEXT,
  interests   TEXT[],
  pain_points TEXT,
  dreams      TEXT,
  platforms   TEXT[],
  tone        TEXT[],
  description TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own data only" ON audiences
  FOR ALL USING (auth.uid() = user_id);

-- 2. Add language fields to persona_profile (safe to run even if they exist)
ALTER TABLE persona_profile
  ADD COLUMN IF NOT EXISTS input_language  TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS output_language TEXT DEFAULT 'English';
