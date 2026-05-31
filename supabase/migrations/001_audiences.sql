-- ============================================================
-- Migration 001 — Audiences table + persona_profile additions
-- Run in Supabase SQL Editor
-- ============================================================

-- Add new columns to persona_profile
alter table persona_profile
  add column if not exists communication_style text,
  add column if not exists sample_captions     text[] default '{}',
  add column if not exists style_fingerprint   text;

-- ============================================================
-- audiences
-- ============================================================
create table if not exists audiences (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  niche            text,
  who_they_are     text,
  biggest_struggles text,
  goals            text,
  content_pillars  text[]  default '{}',
  primary_platform text    check (primary_platform in (
                             'instagram','linkedin','tiktok','youtube','twitter','newsletter'
                           )),
  content_goal     text    check (content_goal in ('inspire','educate','entertain','sell')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table audiences enable row level security;

create policy "Users can view own audiences"
  on audiences for select using (auth.uid() = user_id);
create policy "Users can insert own audiences"
  on audiences for insert with check (auth.uid() = user_id);
create policy "Users can update own audiences"
  on audiences for update using (auth.uid() = user_id);
create policy "Users can delete own audiences"
  on audiences for delete using (auth.uid() = user_id);

create trigger set_updated_at before update on audiences
  for each row execute function update_updated_at();
