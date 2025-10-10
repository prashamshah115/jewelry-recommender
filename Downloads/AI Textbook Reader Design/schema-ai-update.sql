-- Add AI processing status columns to textbooks table
-- Run this in your Supabase SQL Editor

ALTER TABLE textbooks 
ADD COLUMN IF NOT EXISTS ai_processing_status TEXT DEFAULT 'pending' 
  CHECK (ai_processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS ai_processing_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_processing_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_processing_error TEXT;

-- Create index for querying by AI status
CREATE INDEX IF NOT EXISTS idx_textbooks_ai_processing_status ON textbooks(ai_processing_status);

-- Update existing textbooks to have pending AI status
UPDATE textbooks 
SET ai_processing_status = 'pending' 
WHERE ai_processing_status IS NULL;

