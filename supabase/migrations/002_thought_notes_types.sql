-- Migration 002 — Add note_type and raw_ideas to thought_notes
-- Run in Supabase SQL Editor

alter table thought_notes
  add column if not exists note_type text default 'voice'
    check (note_type in ('voice', 'photo', 'text')),
  add column if not exists raw_ideas jsonb;
