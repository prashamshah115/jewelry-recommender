-- AI Textbook Reader Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Allowed Users (Whitelist)
CREATE TABLE IF NOT EXISTS allowed_users (
  email TEXT PRIMARY KEY,
  added_by TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'))
);

-- Add your email to whitelist (REPLACE WITH YOUR EMAIL)
-- INSERT INTO allowed_users (email, role) VALUES ('your-email@example.com', 'admin');

-- 2. User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_goals TEXT,
  target_level TEXT DEFAULT 'intermediate' CHECK (target_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_summary_style TEXT DEFAULT 'concise' CHECK (preferred_summary_style IN ('concise', 'detailed', 'bullet-points')),
  ai_personality TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Textbooks
CREATE TABLE IF NOT EXISTS textbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  pdf_url TEXT,
  total_pages INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_textbooks_user_id ON textbooks(user_id);

-- 4. Pages
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  raw_text TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(textbook_id, page_number)
);

CREATE INDEX idx_pages_textbook_id ON pages(textbook_id);
CREATE INDEX idx_pages_textbook_page ON pages(textbook_id, page_number);

-- 5. AI Processed Content
CREATE TABLE IF NOT EXISTS ai_processed_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL UNIQUE,
  summary TEXT,
  key_concepts JSONB,
  connections_to_previous JSONB,
  applications JSONB,
  practice_questions JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_content_page_id ON ai_processed_content(page_id);

-- 6. User Notes
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER,
  content TEXT NOT NULL,
  position JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX idx_user_notes_textbook ON user_notes(user_id, textbook_id);
CREATE INDEX idx_user_notes_page ON user_notes(user_id, textbook_id, page_number);

-- 7. Chat Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE NOT NULL,
  context_pages INTEGER[] DEFAULT '{}',
  messages JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_user_textbook ON chat_conversations(user_id, textbook_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processed_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- User Preferences: Users can only access their own preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Textbooks: Users can only access their own textbooks
CREATE POLICY "Users can view their own textbooks"
  ON textbooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own textbooks"
  ON textbooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own textbooks"
  ON textbooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own textbooks"
  ON textbooks FOR DELETE
  USING (auth.uid() = user_id);

-- Pages: Users can access pages of their textbooks
CREATE POLICY "Users can view pages of their textbooks"
  ON pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM textbooks
      WHERE textbooks.id = pages.textbook_id
      AND textbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pages to their textbooks"
  ON pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM textbooks
      WHERE textbooks.id = pages.textbook_id
      AND textbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pages of their textbooks"
  ON pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM textbooks
      WHERE textbooks.id = pages.textbook_id
      AND textbooks.user_id = auth.uid()
    )
  );

-- AI Processed Content: Users can view AI content for their textbook pages
CREATE POLICY "Users can view AI content for their pages"
  ON ai_processed_content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages
      JOIN textbooks ON pages.textbook_id = textbooks.id
      WHERE pages.id = ai_processed_content.page_id
      AND textbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert AI content for their pages"
  ON ai_processed_content FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages
      JOIN textbooks ON pages.textbook_id = textbooks.id
      WHERE pages.id = ai_processed_content.page_id
      AND textbooks.user_id = auth.uid()
    )
  );

-- User Notes: Users can only access their own notes
CREATE POLICY "Users can CRUD their own notes"
  ON user_notes FOR ALL
  USING (auth.uid() = user_id);

-- Chat Conversations: Users can only access their own chats
CREATE POLICY "Users can CRUD their own chats"
  ON chat_conversations FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE BUCKET FOR PDFs
-- ============================================

-- Create storage bucket (run this in Storage section or via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('textbook-pdfs', 'textbook-pdfs', false)
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'textbook-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'textbook-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'textbook-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- HELPFUL QUERIES
-- ============================================

-- Add a user to whitelist:
-- INSERT INTO allowed_users (email, role) VALUES ('user@example.com', 'user');

-- Check if email is whitelisted:
-- SELECT * FROM allowed_users WHERE email = 'user@example.com';

-- Get all textbooks with page count:
-- SELECT t.*, COUNT(p.id) as page_count
-- FROM textbooks t
-- LEFT JOIN pages p ON t.id = p.textbook_id
-- WHERE t.user_id = auth.uid()
-- GROUP BY t.id;

-- Get page with AI content:
-- SELECT p.*, ai.* 
-- FROM pages p
-- LEFT JOIN ai_processed_content ai ON p.id = ai.page_id
-- WHERE p.textbook_id = 'your-textbook-id' AND p.page_number = 1;

