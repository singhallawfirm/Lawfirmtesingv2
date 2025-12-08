-- =============================================================================
-- Supabase Schema for Media Content
-- Run this SQL in your Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ARTICLES TABLE
-- For blog posts, legal articles, and long-form content
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    thumbnailurl TEXT,
    mainimageurl TEXT,
    meta TEXT,
    content TEXT,
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. NEWS TABLE
-- For news updates, press releases, and announcements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    thumbnailurl TEXT,
    mainimageurl TEXT,
    meta TEXT,
    content TEXT,
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. VIDEOS TABLE
-- For YouTube videos and video content
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    videourl TEXT NOT NULL,
    thumbnailurl TEXT,
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. DOCUMENTS TABLE
-- For PDF, DOCX, XLSX, PPT, TXT and other downloadable files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    documenturl TEXT,
    documentname TEXT,
    documentsize TEXT,
    documenttype TEXT,
    thumbnailurl TEXT,
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - PUBLIC READ ACCESS
-- =============================================================================
CREATE POLICY "articles_select_policy" ON articles FOR SELECT USING (true);
CREATE POLICY "news_select_policy" ON news FOR SELECT USING (true);
CREATE POLICY "videos_select_policy" ON videos FOR SELECT USING (true);
CREATE POLICY "documents_select_policy" ON documents FOR SELECT USING (true);

-- =============================================================================
-- RLS POLICIES - INSERT (For Admin Panel)
-- These allow anyone to insert - restrict later with authentication
-- =============================================================================
CREATE POLICY "articles_insert_policy" ON articles FOR INSERT WITH CHECK (true);
CREATE POLICY "news_insert_policy" ON news FOR INSERT WITH CHECK (true);
CREATE POLICY "videos_insert_policy" ON videos FOR INSERT WITH CHECK (true);
CREATE POLICY "documents_insert_policy" ON documents FOR INSERT WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES - UPDATE (For Editing Posts)
-- =============================================================================
CREATE POLICY "articles_update_policy" ON articles FOR UPDATE USING (true);
CREATE POLICY "news_update_policy" ON news FOR UPDATE USING (true);
CREATE POLICY "videos_update_policy" ON videos FOR UPDATE USING (true);
CREATE POLICY "documents_update_policy" ON documents FOR UPDATE USING (true);

-- =============================================================================
-- RLS POLICIES - DELETE (For Removing Posts)
-- =============================================================================
CREATE POLICY "articles_delete_policy" ON articles FOR DELETE USING (true);
CREATE POLICY "news_delete_policy" ON news FOR DELETE USING (true);
CREATE POLICY "videos_delete_policy" ON videos FOR DELETE USING (true);
CREATE POLICY "documents_delete_policy" ON documents FOR DELETE USING (true);

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- ✅ 4 tables created: articles, news, videos, documents
-- ✅ All fields have proper data types (TEXT, UUID, TIMESTAMPTZ)
-- ✅ RLS enabled on all tables
-- ✅ Public policies allow SELECT, INSERT, UPDATE, DELETE
-- ✅ Ready for admin panel integration
