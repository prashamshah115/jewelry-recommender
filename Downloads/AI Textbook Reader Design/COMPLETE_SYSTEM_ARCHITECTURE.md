# Complete System Architecture & Implementation Plan

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER UPLOADS PDF                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: PDF PROCESSING (We just built this! ✅)               │
├─────────────────────────────────────────────────────────────────┤
│  1. Upload PDF to Supabase Storage                              │
│  2. Extract text from each page (server-side)                   │
│  3. Store in `pages` table                                      │
│  Status: pending → processing → completed                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: AI PROCESSING (Need to build 🔨)                      │
├─────────────────────────────────────────────────────────────────┤
│  For each page:                                                 │
│    1. Send page text to AI model                               │
│    2. Generate:                                                 │
│       - Summary                                                 │
│       - Key concepts                                            │
│       - Connections to previous pages                           │
│       - Real-world applications                                 │
│       - Practice questions                                      │
│    3. Store in `ai_processed_content` table                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: USER INTERACTION (Partially built)                    │
├─────────────────────────────────────────────────────────────────┤
│  - Read pages with AI summaries ✅                              │
│  - Take notes (exists, needs sync) 🔨                           │
│  - Chat with AI about content 🔨                                │
│  - Practice with questions 🔨                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Current State vs Target State

### ✅ What's Built
- User authentication
- PDF upload & text extraction (server-side)
- Database schema for everything
- Basic UI components
- Notes context (frontend only)
- Chat context (frontend only)

### 🔨 What Needs Building

#### 1. **AI Processing Pipeline**
- Trigger AI processing after PDF extraction
- Queue system for processing pages
- API endpoint to call AI model
- Progress tracking for AI processing

#### 2. **AI Model Integration**
- Choose and configure model (Ollama, OpenAI, Claude, etc.)
- Create prompts for different content types
- Handle rate limits and retries
- Store AI-generated content

#### 3. **Notes Management**
- Sync notes to database
- Real-time updates
- Organize by page/section

#### 4. **Chat System**
- Implement RAG (Retrieval Augmented Generation)
- Store chat history
- Context management (which pages to include)

---

## Architecture Decision Tree

### Question 1: Where Should AI Processing Run?

#### Option A: Local/On-Device (Ollama) 🏠
**Pros:**
- Free (no API costs)
- Privacy (data stays local)
- No rate limits

**Cons:**
- User needs powerful computer
- Slow on weak hardware
- Can't process in background (needs app open)
- Initial model download (~4GB)

**Best for:** Power users, privacy-focused, offline use

#### Option B: Cloud API (OpenAI/Claude/Groq) ☁️
**Pros:**
- Fast and reliable
- Works on any device
- Background processing
- No local requirements

**Cons:**
- Costs money (varies by model)
- API rate limits
- Requires API keys

**Best for:** Production apps, mobile users, guaranteed speed

#### Option C: Hybrid 🔀
**Pros:**
- User chooses
- Best of both worlds

**Cons:**
- More complex code
- Need to maintain both paths

**Best for:** Maximum flexibility

---

## Recommended Implementation Plan

### Phase 1: AI Processing (Week 1) 🎯

```
┌─────────────────────────────────────────────────────┐
│  POST /api/process-pdf-ai                           │
│  ├── Input: textbookId                              │
│  ├── Triggered after text extraction completes      │
│  └── Process:                                       │
│      1. Fetch all pages from database               │
│      2. For each page (in order):                   │
│         a. Call AI with page text + prompt          │
│         b. Parse response                           │
│         c. Store in ai_processed_content            │
│         d. Update progress                          │
│      3. Mark textbook as ai_processed               │
└─────────────────────────────────────────────────────┘
```

**Files to create:**
- `api/process-pdf-ai.ts` - AI processing endpoint
- `src/lib/ai/aiProcessor.ts` - AI model interface
- `src/lib/ai/prompts.ts` - Prompts for each content type (already exists!)

**Database updates:**
```sql
ALTER TABLE textbooks 
ADD COLUMN IF NOT EXISTS ai_processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_processing_progress INTEGER DEFAULT 0;
```

### Phase 2: Notes Sync (Week 1) 📝

```
┌─────────────────────────────────────────────────────┐
│  Notes Flow                                         │
│  ├── User types in NotesPanel                       │
│  ├── Debounced save (1 second delay)                │
│  ├── POST to database                               │
│  └── Sync across devices via Supabase realtime      │
└─────────────────────────────────────────────────────┘
```

**Files to modify:**
- `src/contexts/NotesContext.tsx` - Add database sync
- Add debounced save function

### Phase 3: Chat System (Week 2) 💬

```
┌─────────────────────────────────────────────────────┐
│  Chat Flow                                          │
│  ├── User asks question                             │
│  ├── Retrieve relevant pages (vector search)        │
│  ├── Build context with page content                │
│  ├── Call AI with context + question                │
│  ├── Stream response to user                        │
│  └── Store conversation in database                 │
└─────────────────────────────────────────────────────┘
```

**Files to create/modify:**
- `api/chat.ts` - Already exists! Need to connect it
- `src/contexts/ChatContext.tsx` - Add API integration

---

## AI Model Recommendation

### For MVP (Fastest to Ship):

**Use Groq API** 🚀
- **Why:** Fastest inference (300+ tokens/sec)
- **Cost:** Free tier: 14,400 requests/day
- **Model:** llama-3.1-70b-versatile
- **Setup:** Just add API key

```bash
# Get free API key
https://console.groq.com

# Add to .env
GROQ_API_KEY=your_key_here
```

### Cost Estimate:
- Average textbook: 200 pages
- AI processing per page: ~2000 tokens
- Total per book: 400k tokens
- Cost with Groq: **$0 (free tier)**
- Cost with OpenAI: ~$0.80/book
- Cost with Claude: ~$3/book

---

## Implementation Roadmap

### Sprint 1 (This Week) - Core AI Features
- [x] PDF upload & extraction (DONE!)
- [ ] Deploy to Vercel
- [ ] AI processing pipeline
- [ ] Display AI summaries
- [ ] Notes database sync

### Sprint 2 (Next Week) - Interactive Features  
- [ ] Chat with AI
- [ ] Practice questions
- [ ] Search within textbook
- [ ] Export notes

### Sprint 3 (Following Week) - Polish
- [ ] Real-time collaboration
- [ ] Mobile responsive
- [ ] Performance optimization
- [ ] Error handling & retries

---

## Next Immediate Steps

1. **Choose AI Model** (I recommend Groq for now)
2. **Deploy current code** to Vercel
3. **Create AI processing endpoint**
4. **Test end-to-end flow**
5. **Add notes sync**

---

## Questions for You

1. **AI Model Choice:** Groq (free, fast) vs OpenAI (most capable) vs Ollama (local)?
2. **Priority:** What feature is most important first?
   - AI summaries and concepts?
   - Chat functionality?
   - Notes syncing?
3. **Budget:** Any constraints on API costs?
4. **Timeline:** When do you need this live?

Let me know your preferences and I'll start building! 🚀

