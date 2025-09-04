-- Migration: Create public_links and public_comments tables for public sharing
-- Adds an expirable token for sharing embarque and a comments table

-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: public_links
CREATE TABLE IF NOT EXISTS public_links (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id uuid NOT NULL REFERENCES embarques(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_public_links_embarque_id ON public_links(embarque_id);

-- Table: public_comments
CREATE TABLE IF NOT EXISTS public_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_link_token uuid NOT NULL REFERENCES public_links(token) ON DELETE CASCADE,
  embarque_id uuid NOT NULL REFERENCES embarques(id) ON DELETE CASCADE,
  name text,
  message text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_public_comments_embarque_id ON public_comments(embarque_id);

-- Optional: keep a small retention policy (example: delete links older than X days) can be run as a scheduled job
-- Example cleanup (do not run here automatically):
-- DELETE FROM public_links WHERE expires_at < now() - interval '30 days';
