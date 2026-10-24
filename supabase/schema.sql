-- ==============================================================================
-- RENEU - SUPABASE PRODUCTION DATABASE SCHEMA (MULTI-USER READY)
-- ==============================================================================
-- Run this script in your Supabase Project -> SQL Editor
-- This prepares your PostgreSQL database for full multi-user cloud sync with Reneu.
--
-- COST BREAKDOWN:
-- Supabase Free Tier includes:
--   ✓ Up to 50,000 Monthly Active Users (MAUs) - $0/month
--   ✓ Email & Password Authentication - $0/month (standalone, no 3rd party accounts needed)
--   ✓ Google OAuth Sign-In - $0/month (Google Cloud OAuth consent is free)
--   ✓ Row Level Security (RLS) data isolation - $0/month
--   ✕ Apple Sign-In requires an active Apple Developer Program membership ($99/year)
-- ==============================================================================

-- 1. Create the `notes` table with `user_id` tied to Supabase Auth (`auth.users`)
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    book_id INTEGER NOT NULL DEFAULT 0,
    book_name TEXT NOT NULL DEFAULT '',
    chapter INTEGER NOT NULL DEFAULT 0,
    start_verse INTEGER NOT NULL DEFAULT 0,
    end_verse INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL DEFAULT '',
    title TEXT,
    is_synthesis BOOLEAN NOT NULL DEFAULT FALSE,
    is_plain_note BOOLEAN NOT NULL DEFAULT FALSE,
    is_starred BOOLEAN NOT NULL DEFAULT FALSE,
    synthesis_quote TEXT,
    source_references JSONB DEFAULT '[]'::jsonb,
    source_note_ids JSONB DEFAULT '[]'::jsonb,
    source_footnotes JSONB DEFAULT '[]'::jsonb,
    key_themes JSONB DEFAULT '[]'::jsonb,
    trajectory_summary TEXT,
    practical_application TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Index frequently queried columns for high-performance filtering
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_book_chapter ON public.notes(book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes(updated_at DESC);

-- 2. Create the `user_settings` table (isolated per user)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    value JSONB NOT NULL,
    updated_at BIGINT NOT NULL,
    CONSTRAINT user_settings_key_user_key UNIQUE (key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.user_settings(key);

-- 3. Enable PostgreSQL Row Level Security (RLS)
-- This guarantees at the database engine level that no user can access or modify another user's notes!
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 4. Multi-User Row Level Security (RLS) Policies
-- Drop older generic policies if they exist
DROP POLICY IF EXISTS "Allow public read on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow public insert on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow public update on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow public delete on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow public read on settings" ON public.user_settings;
DROP POLICY IF EXISTS "Allow public upsert on settings" ON public.user_settings;

DROP POLICY IF EXISTS "Users can only read their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can only insert their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can only update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can only delete their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;

-- Strict Multi-User Policies for Authenticated Users:
CREATE POLICY "Users can only read their own notes"
    ON public.notes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own notes"
    ON public.notes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can only update their own notes"
    ON public.notes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own notes"
    ON public.notes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- User settings policies for authenticated users
CREATE POLICY "Users can manage their own settings"
    ON public.user_settings
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Security Architecture for Unauthenticated / Guest Users:
-- By default, Reneu operates strictly LOCAL-FIRST for guests (persisted securely
-- inside client IndexedDB via Dexie without transmitting private reflections over the wire).
--
-- SECURITY WARNING (OWASP API1:2023 / CWE-284):
-- Granting universal "anon" access with `user_id IS NULL` allows ANY unauthenticated client
-- on the internet to read, modify, or delete every other guest's notes!
--
-- Therefore, cloud sync is strictly scoped to authenticated users with unique auth.uid().
-- If anonymous cloud syncing is ever desired, use Supabase Anonymous Sign-In
-- (`supabase.auth.signInAnonymously()`) which assigns a cryptographic UUID to each anonymous
-- device, allowing the secure policies in Section 4 to isolate each guest safely!

-- ==============================================================================
-- Schema ready!
-- Next steps:
-- 1. In Supabase Dashboard -> Authentication -> Providers:
--    - "Email": Enabled by default (Standalone credentials, 100% free)
--    - "Google": Optional (100% free, requires Google Cloud OAuth Client ID)
-- 2. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Project.
-- ==============================================================================
