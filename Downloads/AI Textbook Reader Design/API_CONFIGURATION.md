# API Configuration Summary

## ✅ GROQ (Fast & Heavy Lifting)

**Model**: `llama-3.1-70b-versatile`

Used for:
1. **`/api/explain-text`** - Text explanations (tooltip)
2. **`/api/detect-chapters`** - Chapter boundary detection
3. **`/api/generate-chapter-content`** - Chapter summaries + recall questions
4. **`/api/process-pdf-ai`** - Orchestrates chapter processing (calls generate-chapter-content)

## ✅ OpenAI (Chat Only)

**Model**: `gpt-4-turbo-preview`

Used for:
1. **`/api/chat`** - Context-aware chat ONLY

## 📋 Environment Variables Required

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# AI APIs
GROQ_API_KEY=your-groq-api-key      # For heavy processing
OPENAI_API_KEY=your-openai-api-key  # For chat only
```

## 🔄 PDF Processing Flow

1. **User uploads PDF**
   - Client-side text extraction (pdf-parse)
   - Stores in `pages` table
   
2. **Chapter Detection** (`/api/detect-chapters`)
   - Uses GROQ to analyze first 50 pages
   - Detects chapter boundaries
   - Stores in `chapters` table
   
3. **AI Processing** (`/api/process-pdf-ai`)
   - Fetches all chapters
   - Calls `/api/generate-chapter-content` for each chapter
   
4. **Chapter Content Generation** (`/api/generate-chapter-content`)
   - GROQ: Generate 250-word summary
   - GROQ: Extract 5-7 key concepts
   - GROQ: Generate 8-10 recall questions with answers
   - Store in `chapter_summaries` and `recall_questions` tables

## ✅ PDF Processing Status

**RESOLVED**: 
- ✅ Client-side PDF text extraction (works in browser)
- ✅ Background processing (doesn't block UI)
- ✅ Chapter-based processing (efficient)
- ✅ All GROQ endpoints configured
- ✅ OpenAI only used for chat

## 🎯 Cost Optimization

**GROQ** (Free/cheap):
- Chapter detection: ~1 call per textbook
- Summaries: 1 call per chapter
- Recall questions: 1 call per chapter
- Explanations: 1 call per text selection

**OpenAI** (Expensive):
- Chat: Only when user asks questions
- Average: ~50 messages/month per active user

**Estimated cost per user/month**: 
- GROQ: ~$0 (free tier covers most)
- OpenAI Chat: ~$0.50 (only chat usage)
- **Total: ~$0.50/user/month** 🎉

## 🚀 Ready to Deploy

All API endpoints configured correctly:
- GROQ for processing
- OpenAI for chat
- No conflicts
- Cost-optimized

