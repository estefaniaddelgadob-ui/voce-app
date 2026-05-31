-- ============================================================
-- Voce App — Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 1. persona_profile
--    One row per user. Stores their AI voice + content style.
-- ============================================================
create table if not exists persona_profile (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  display_name    text,
  bio             text,
  tone            text check (tone in ('professional', 'casual', 'inspirational', 'educational', 'conversational')),
  target_audience text,
  content_pillars text[]   default '{}',
  platforms       text[]   default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id)
);

alter table persona_profile enable row level security;

create policy "Users can view own persona"
  on persona_profile for select
  using (auth.uid() = user_id);

create policy "Users can insert own persona"
  on persona_profile for insert
  with check (auth.uid() = user_id);

create policy "Users can update own persona"
  on persona_profile for update
  using (auth.uid() = user_id);

create policy "Users can delete own persona"
  on persona_profile for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 2. thought_notes
--    Voice recordings + transcripts captured by the user.
-- ============================================================
create table if not exists thought_notes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text,
  transcript       text,
  audio_url        text,
  duration_seconds integer,
  tags             text[] default '{}',
  status           text not null default 'raw'
                     check (status in ('raw', 'processing', 'processed', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table thought_notes enable row level security;

create policy "Users can view own thought notes"
  on thought_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own thought notes"
  on thought_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own thought notes"
  on thought_notes for update
  using (auth.uid() = user_id);

create policy "Users can delete own thought notes"
  on thought_notes for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 3. content_drafts
--    AI-generated content pieces derived from thought notes.
-- ============================================================
create table if not exists content_drafts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  thought_note_id uuid references thought_notes(id) on delete set null,
  title           text,
  body            text,
  platform        text check (platform in (
                    'linkedin', 'twitter', 'instagram',
                    'newsletter', 'blog', 'youtube'
                  )),
  status          text not null default 'draft'
                    check (status in ('draft', 'ready', 'published', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table content_drafts enable row level security;

create policy "Users can view own content drafts"
  on content_drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert own content drafts"
  on content_drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own content drafts"
  on content_drafts for update
  using (auth.uid() = user_id);

create policy "Users can delete own content drafts"
  on content_drafts for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 4. photo_library
--    Images uploaded by the user for use in posts.
-- ============================================================
create table if not exists photo_library (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  url          text not null,
  storage_path text,
  caption      text,
  tags         text[] default '{}',
  created_at   timestamptz not null default now()
);

alter table photo_library enable row level security;

create policy "Users can view own photos"
  on photo_library for select
  using (auth.uid() = user_id);

create policy "Users can insert own photos"
  on photo_library for insert
  with check (auth.uid() = user_id);

create policy "Users can update own photos"
  on photo_library for update
  using (auth.uid() = user_id);

create policy "Users can delete own photos"
  on photo_library for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 5. saved_timeframes
--    Named date ranges the user saves (e.g. "Q1 2024").
-- ============================================================
create table if not exists saved_timeframes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  start_date  date not null,
  end_date    date not null,
  description text,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table saved_timeframes enable row level security;

create policy "Users can view own timeframes"
  on saved_timeframes for select
  using (auth.uid() = user_id);

create policy "Users can insert own timeframes"
  on saved_timeframes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own timeframes"
  on saved_timeframes for update
  using (auth.uid() = user_id);

create policy "Users can delete own timeframes"
  on saved_timeframes for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 6. scheduled_posts
--    Content queued to publish to a platform at a set time.
-- ============================================================
create table if not exists scheduled_posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  content_draft_id uuid references content_drafts(id) on delete set null,
  platform         text not null check (platform in (
                     'linkedin', 'twitter', 'instagram',
                     'newsletter', 'blog', 'youtube'
                   )),
  body             text not null,
  scheduled_at     timestamptz not null,
  status           text not null default 'scheduled'
                     check (status in ('scheduled', 'published', 'failed', 'cancelled')),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table scheduled_posts enable row level security;

create policy "Users can view own scheduled posts"
  on scheduled_posts for select
  using (auth.uid() = user_id);

create policy "Users can insert own scheduled posts"
  on scheduled_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scheduled posts"
  on scheduled_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete own scheduled posts"
  on scheduled_posts for delete
  using (auth.uid() = user_id);


-- ============================================================
-- Auto-update updated_at on row changes
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on persona_profile
  for each row execute function update_updated_at();

create trigger set_updated_at before update on thought_notes
  for each row execute function update_updated_at();

create trigger set_updated_at before update on content_drafts
  for each row execute function update_updated_at();

create trigger set_updated_at before update on scheduled_posts
  for each row execute function update_updated_at();
