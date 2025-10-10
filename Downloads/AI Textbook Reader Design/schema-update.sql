-- Add processing status columns to textbooks table
-- Run this in your Supabase SQL Editor

ALTER TABLE textbooks 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' 
  CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Create index for querying by status
CREATE INDEX IF NOT EXISTS idx_textbooks_processing_status ON textbooks(processing_status);

-- Create index for user + status queries
CREATE INDEX IF NOT EXISTS idx_textbooks_user_status ON textbooks(user_id, processing_status);

