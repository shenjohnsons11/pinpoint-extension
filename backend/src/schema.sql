-- PinPoint Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor

-- 1. Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('text_selection', 'freehand', 'cell_click')),
  type TEXT NOT NULL CHECK (type IN ('error', 'needs_supplement', 'suggestion', 'resolved')),
  reviewer_email TEXT NOT NULL,
  content TEXT NOT NULL,
  position JSONB NOT NULL,
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on file_url for quick note retrieval by document
CREATE INDEX IF NOT EXISTS idx_notes_file_url ON notes (file_url);

-- 2. Note Replies Table
CREATE TABLE IF NOT EXISTS note_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('reviewer', 'maker')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_replies_note_id ON note_replies (note_id);

-- 3. Row Level Security (RLS) policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_replies ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated read/write for MVP
CREATE POLICY "Public notes access" ON notes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public replies access" ON note_replies
  FOR ALL USING (true) WITH CHECK (true);
