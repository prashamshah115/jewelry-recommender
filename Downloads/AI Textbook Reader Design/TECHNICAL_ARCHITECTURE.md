# Technical Architecture - AI Textbook Reader
## Implementation Deep Dive

---

## 📋 DATABASE SCHEMA (Complete)

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  subscription_tier TEXT DEFAULT 'free' -- for future pricing
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own data"
  ON users FOR ALL
  USING (auth.uid() = id);
```

### Textbooks Table
```sql
CREATE TABLE textbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT, -- in bytes
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  last_opened TIMESTAMPTZ DEFAULT NOW(),
  total_pages INTEGER NOT NULL,
  current_page INTEGER DEFAULT 1,
  cover_image_url TEXT, -- thumbnail
  metadata JSONB DEFAULT '{}', -- flexible metadata
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_textbooks_user ON textbooks(user_id);
CREATE INDEX idx_textbooks_last_opened ON textbooks(user_id, last_opened DESC);

ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own textbooks"
  ON textbooks FOR ALL
  USING (auth.uid() = user_id);
```

### Textbook Content Table (for search)
```sql
CREATE TABLE textbook_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text_content TEXT NOT NULL,
  embedding VECTOR(1536), -- for semantic search (future)
  UNIQUE(textbook_id, page_number)
);

CREATE INDEX idx_content_textbook ON textbook_content(textbook_id);
CREATE INDEX idx_content_search ON textbook_content USING GIN(to_tsvector('english', text_content));

ALTER TABLE textbook_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access content of own textbooks"
  ON textbook_content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM textbooks
      WHERE textbooks.id = textbook_content.textbook_id
      AND textbooks.user_id = auth.uid()
    )
  );
```

### Chapters Table
```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  is_detected BOOLEAN DEFAULT true, -- auto-detected vs manually added
  UNIQUE(textbook_id, chapter_number)
);

CREATE INDEX idx_chapters_textbook ON chapters(textbook_id, chapter_number);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access chapters of own textbooks"
  ON chapters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM textbooks
      WHERE textbooks.id = chapters.textbook_id
      AND textbooks.user_id = auth.uid()
    )
  );
```

### Notes Table
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT NOT NULL DEFAULT '', -- Markdown format
  page_start INTEGER,
  page_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false, -- soft delete
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_textbook FOREIGN KEY (textbook_id) REFERENCES textbooks(id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_user ON notes(user_id, textbook_id) WHERE is_deleted = false;
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes"
  ON notes FOR ALL
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Chapter Summaries Table
```sql
CREATE TABLE chapter_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  key_concepts JSONB DEFAULT '[]', -- array of concepts
  word_count INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model_version TEXT DEFAULT 'gpt-4-turbo', -- track which model generated it
  UNIQUE(chapter_id)
);

CREATE INDEX idx_summaries_chapter ON chapter_summaries(chapter_id);

ALTER TABLE chapter_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access summaries of own textbooks"
  ON chapter_summaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM textbooks
      WHERE textbooks.id = chapter_summaries.textbook_id
      AND textbooks.user_id = auth.uid()
    )
  );
```

### Recall Questions Table
```sql
CREATE TABLE recall_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  order_index INTEGER NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model_version TEXT DEFAULT 'gpt-4-turbo',
  UNIQUE(chapter_id, order_index)
);

CREATE INDEX idx_questions_chapter ON recall_questions(chapter_id, order_index);

ALTER TABLE recall_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access questions of own textbooks"
  ON recall_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM textbooks
      WHERE textbooks.id = recall_questions.textbook_id
      AND textbooks.user_id = auth.uid()
    )
  );
```

### Chat Messages Table
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  page_number INTEGER, -- which page user was on
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tokens_used INTEGER,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_textbook FOREIGN KEY (textbook_id) REFERENCES textbooks(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_textbook ON chat_messages(textbook_id, created_at);
CREATE INDEX idx_chat_user ON chat_messages(user_id, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own chat messages"
  ON chat_messages FOR ALL
  USING (auth.uid() = user_id);
```

---

## 🎨 COMPONENT ARCHITECTURE

### Context Providers
```typescript
// src/contexts/AppContext.tsx
interface AppContextType {
  currentUser: User | null;
  currentTextbook: Textbook | null;
  setCurrentTextbook: (textbook: Textbook) => void;
  textbooks: Textbook[];
  refreshTextbooks: () => Promise<void>;
}

// src/contexts/PDFContext.tsx
interface PDFContextType {
  numPages: number;
  currentPage: number;
  goToPage: (page: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  searchResults: SearchResult[];
  highlightedText: string | null;
}

// src/contexts/NotesContext.tsx
interface NotesContextType {
  notes: Note[];
  activeNote: Note | null;
  setActiveNote: (note: Note | null) => void;
  createNote: (note: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  exportNote: (id: string, format: 'md' | 'pdf') => Promise<void>;
  saveStatus: 'saving' | 'saved' | 'error';
}

// src/contexts/AIContext.tsx
interface AIContextType {
  summaries: Map<number, ChapterSummary>;
  questions: Map<number, RecallQuestion[]>;
  chatHistory: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  generateSummary: (chapterId: string) => Promise<void>;
  generateQuestions: (chapterId: string) => Promise<void>;
  isLoading: boolean;
}
```

### Component Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx                   # Textbook selector, search, user menu
│   │   ├── MainLayout.tsx               # 3-panel layout with resizable
│   │   └── ResizablePanel.tsx           # Drag handle for resizing
│   │
│   ├── notes/
│   │   ├── NotesPanel.tsx               # Left panel container
│   │   ├── NoteEditor.tsx               # TipTap rich text editor
│   │   ├── NotesList.tsx                # Scrollable list of notes
│   │   ├── NoteCard.tsx                 # Individual note preview
│   │   ├── NewNoteButton.tsx            # Create new note
│   │   └── ExportMenu.tsx               # Export options
│   │
│   ├── pdf/
│   │   ├── PDFViewer.tsx                # Main PDF rendering
│   │   ├── PDFPage.tsx                  # Single page component
│   │   ├── PDFControls.tsx              # Zoom, navigation
│   │   ├── TextSelectionLayer.tsx       # Handle text selection
│   │   └── ExplainTooltip.tsx           # Auto-explain popup
│   │
│   ├── ai/
│   │   ├── AIPanel.tsx                  # Right panel container with tabs
│   │   ├── SummaryTab.tsx               # Chapter summaries
│   │   ├── RecallTab.tsx                # Question cards
│   │   ├── ChatTab.tsx                  # Chat interface
│   │   ├── SummaryCard.tsx              # Individual summary display
│   │   ├── QuestionCard.tsx             # Flip card for Q&A
│   │   └── ChatMessage.tsx              # Message bubble
│   │
│   ├── textbook/
│   │   ├── TextbookSelector.tsx         # Dropdown to select textbook
│   │   ├── ManageTextbooksModal.tsx     # Delete, upload new
│   │   └── UploadDialog.tsx             # PDF upload UI
│   │
│   ├── search/
│   │   ├── SearchBar.tsx                # Header search input
│   │   ├── SearchResults.tsx            # Results panel
│   │   └── SearchHighlight.tsx          # Highlight in PDF
│   │
│   └── ui/
│       └── [shadcn components]          # Button, Dialog, etc.
│
├── contexts/                            # Context providers (above)
│
├── hooks/
│   ├── useAutoSave.ts                   # Debounced auto-save logic
│   ├── usePDFLoader.ts                  # PDF loading and caching
│   ├── useChapterDetection.ts           # Detect chapters from PDF
│   ├── useTextSelection.ts              # Handle text selection
│   ├── useAIGeneration.ts               # AI content generation
│   └── useSearch.ts                     # Full-text search
│
├── lib/
│   ├── supabase.ts                      # Supabase client
│   ├── openai.ts                        # OpenAI client
│   ├── pdfProcessor.ts                  # PDF text extraction
│   ├── chapterDetector.ts               # ML-based chapter detection
│   ├── markdownExporter.ts              # Export notes to Markdown
│   └── pdfExporter.ts                   # Export notes to PDF
│
└── services/
    ├── textbookService.ts               # CRUD for textbooks
    ├── notesService.ts                  # CRUD for notes
    ├── aiService.ts                     # AI generation calls
    └── searchService.ts                 # Full-text search
```

---

## 🔌 API ENDPOINTS (Supabase Edge Functions)

### 1. Process PDF Upload
```typescript
// supabase/functions/process-pdf/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { pdfToPng } from 'pdf-to-png-converter'
import pdf from 'pdf-parse'

serve(async (req) => {
  const { fileUrl, textbookId } = await req.json()
  
  // 1. Download PDF from Storage
  const pdfBuffer = await fetch(fileUrl).then(r => r.arrayBuffer())
  
  // 2. Extract text per page
  const data = await pdf(pdfBuffer)
  const pages = data.text.split('\f') // form feed separates pages
  
  // 3. Store in textbook_content
  const supabase = createClient(...)
  for (let i = 0; i < pages.length; i++) {
    await supabase.from('textbook_content').insert({
      textbook_id: textbookId,
      page_number: i + 1,
      text_content: pages[i]
    })
  }
  
  // 4. Generate cover thumbnail
  const png = await pdfToPng(pdfBuffer, { pageNumber: 1 })
  const coverUrl = await uploadToStorage(png)
  
  // 5. Update textbook metadata
  await supabase.from('textbooks').update({
    total_pages: pages.length,
    cover_image_url: coverUrl
  }).eq('id', textbookId)
  
  return new Response(JSON.stringify({ success: true }))
})
```

### 2. Detect Chapters
```typescript
// supabase/functions/detect-chapters/index.ts

serve(async (req) => {
  const { textbookId } = await req.json()
  
  // 1. Get all pages text
  const pages = await supabase
    .from('textbook_content')
    .select('page_number, text_content')
    .eq('textbook_id', textbookId)
    .order('page_number')
  
  // 2. Detect chapter headings
  const chapters = detectChapters(pages.data) // ML algorithm
  
  // 3. Store chapters
  for (const chapter of chapters) {
    await supabase.from('chapters').insert({
      textbook_id: textbookId,
      chapter_number: chapter.number,
      title: chapter.title,
      page_start: chapter.start,
      page_end: chapter.end
    })
  }
  
  return new Response(JSON.stringify({ chapters }))
})

function detectChapters(pages) {
  // Heuristic: Look for patterns like "Chapter 1:", "1. Introduction"
  const chapters = []
  const regex = /^(Chapter|CHAPTER)\s+(\d+)[:\s]*(.+)/m
  
  pages.forEach((page, idx) => {
    const match = page.text_content.match(regex)
    if (match) {
      chapters.push({
        number: parseInt(match[2]),
        title: match[3].trim(),
        start: page.page_number,
        end: pages[idx + 1]?.page_number - 1 || pages.length
      })
    }
  })
  
  return chapters
}
```

### 3. Generate Summary
```typescript
// supabase/functions/generate-summary/index.ts

import OpenAI from 'openai'

serve(async (req) => {
  const { chapterId } = await req.json()
  
  // 1. Get chapter text
  const chapter = await supabase
    .from('chapters')
    .select('*, textbook:textbooks(*)')
    .eq('id', chapterId)
    .single()
  
  const content = await supabase
    .from('textbook_content')
    .select('text_content')
    .eq('textbook_id', chapter.textbook_id)
    .gte('page_number', chapter.page_start)
    .lte('page_number', chapter.page_end)
  
  const fullText = content.data.map(p => p.text_content).join('\n')
  
  // 2. Call OpenAI
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at summarizing textbook chapters. Provide a clear, concise summary with key concepts.'
      },
      {
        role: 'user',
        content: `Summarize this chapter in 200-250 words. Then list 5-7 key concepts.\n\nChapter: "${chapter.title}"\n\nContent:\n${fullText}`
      }
    ],
    temperature: 0.3
  })
  
  const response = completion.choices[0].message.content
  
  // 3. Parse response (assuming structured format)
  const [summary, conceptsSection] = response.split('Key Concepts:')
  const concepts = conceptsSection
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.trim().substring(2))
  
  // 4. Store summary
  await supabase.from('chapter_summaries').insert({
    textbook_id: chapter.textbook_id,
    chapter_id: chapterId,
    summary_text: summary.trim(),
    key_concepts: concepts,
    word_count: summary.split(' ').length
  })
  
  return new Response(JSON.stringify({ summary, concepts }))
})
```

### 4. Generate Recall Questions
```typescript
// supabase/functions/generate-questions/index.ts

serve(async (req) => {
  const { chapterId } = await req.json()
  
  // Similar to generate-summary, but prompt for questions
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: 'Generate 8-10 recall questions for this chapter. Return as JSON array with format: [{"question": "...", "answer": "...", "difficulty": "easy|medium|hard"}]'
      },
      {
        role: 'user',
        content: `Chapter: "${chapter.title}"\n\nContent:\n${fullText}`
      }
    ],
    response_format: { type: 'json_object' }
  })
  
  const questions = JSON.parse(completion.choices[0].message.content).questions
  
  // Store questions
  for (let i = 0; i < questions.length; i++) {
    await supabase.from('recall_questions').insert({
      textbook_id: chapter.textbook_id,
      chapter_id: chapterId,
      question: questions[i].question,
      answer: questions[i].answer,
      difficulty: questions[i].difficulty,
      order_index: i
    })
  }
  
  return new Response(JSON.stringify({ questions }))
})
```

### 5. Chat
```typescript
// supabase/functions/chat/index.ts

serve(async (req) => {
  const { message, textbookId, pageNumber } = await req.json()
  
  // 1. Get context
  const textbook = await supabase.from('textbooks').select('*').eq('id', textbookId).single()
  const pageText = await supabase.from('textbook_content').select('text_content').eq('textbook_id', textbookId).eq('page_number', pageNumber).single()
  
  // Get chapter summary if available
  const chapter = await supabase.from('chapters').select('id').eq('textbook_id', textbookId).gte('page_start', pageNumber).lte('page_end', pageNumber).single()
  const summary = await supabase.from('chapter_summaries').select('summary_text').eq('chapter_id', chapter.id).single()
  
  // Get last 3 chat messages
  const history = await supabase.from('chat_messages').select('*').eq('textbook_id', textbookId).order('created_at', { ascending: false }).limit(6)
  
  // 2. Construct context
  const systemPrompt = `You are an expert tutor for the textbook "${textbook.title}". 
  
Context:
- Current page (${pageNumber}): ${pageText.data?.text_content.substring(0, 500)}...
- Chapter summary: ${summary.data?.summary_text}

Answer the student's question clearly and concisely. Reference specific content from the textbook when relevant.`
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.data.reverse().map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]
  
  // 3. Call OpenAI with streaming
  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages,
    stream: true
  })
  
  // 4. Stream response
  const encoder = new TextEncoder()
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
      }
      controller.close()
    }
  })
  
  // 5. Store messages (after streaming completes)
  // ... store logic
  
  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  })
})
```

---

## 🎯 KEY ALGORITHMS

### Auto-Save Logic
```typescript
// src/hooks/useAutoSave.ts

import { useEffect, useRef, useState } from 'react'
import { debounce } from 'lodash'

export function useAutoSave(
  content: string,
  saveFunction: (content: string) => Promise<void>
) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  
  const debouncedSave = useRef(
    debounce(async (content: string) => {
      setSaveStatus('saving')
      try {
        await saveFunction(content)
        setSaveStatus('saved')
      } catch (error) {
        setSaveStatus('error')
        console.error('Save failed:', error)
        // Store in localStorage as backup
        localStorage.setItem('note_backup', content)
      }
    }, 2000)
  ).current
  
  useEffect(() => {
    if (content) {
      debouncedSave(content)
    }
    
    return () => {
      debouncedSave.cancel()
    }
  }, [content])
  
  return saveStatus
}
```

### Text Selection & Explain
```typescript
// src/hooks/useTextSelection.ts

export function useTextSelection(onExplain: (text: string) => void) {
  const [selection, setSelection] = useState<{
    text: string
    rect: DOMRect | null
  }>({ text: '', rect: null })
  
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection()
      if (sel && sel.toString().length > 0) {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        setSelection({
          text: sel.toString(),
          rect
        })
      } else {
        setSelection({ text: '', rect: null })
      }
    }
    
    document.addEventListener('mouseup', handleSelection)
    
    return () => {
      document.removeEventListener('mouseup', handleSelection)
    }
  }, [])
  
  const explainSelection = useCallback(async () => {
    if (selection.text) {
      await onExplain(selection.text)
    }
  }, [selection.text, onExplain])
  
  return { selection, explainSelection }
}
```

### Chapter Detection Algorithm
```typescript
// src/lib/chapterDetector.ts

export interface Chapter {
  number: number
  title: string
  pageStart: number
  pageEnd: number
  confidence: number
}

export function detectChapters(pages: Array<{
  pageNumber: number
  text: string
}>): Chapter[] {
  const chapters: Chapter[] = []
  
  // Pattern 1: "Chapter X: Title" or "CHAPTER X - Title"
  const chapterRegex = /^(Chapter|CHAPTER)\s+(\d+)[:\-\s]+(.+?)$/m
  
  // Pattern 2: Large numbered heading "1. Introduction" (if no "Chapter" keyword)
  const numberedRegex = /^(\d+)\.\s+([A-Z][A-Za-z\s]{3,30})$/m
  
  // Pattern 3: All-caps heading "INTRODUCTION" (fallback)
  const capsRegex = /^([A-Z]{5,})$/m
  
  let lastChapterEnd = 0
  
  pages.forEach((page, idx) => {
    // Try pattern 1 first
    let match = page.text.match(chapterRegex)
    if (match) {
      chapters.push({
        number: parseInt(match[2]),
        title: match[3].trim(),
        pageStart: page.pageNumber,
        pageEnd: 0, // will fill later
        confidence: 0.95
      })
      return
    }
    
    // Try pattern 2
    match = page.text.match(numberedRegex)
    if (match && !chapters.some(c => c.number === parseInt(match[1]))) {
      chapters.push({
        number: parseInt(match[1]),
        title: match[2].trim(),
        pageStart: page.pageNumber,
        pageEnd: 0,
        confidence: 0.7
      })
      return
    }
    
    // Try pattern 3 (only if no chapters found yet)
    if (chapters.length === 0) {
      match = page.text.match(capsRegex)
      if (match) {
        chapters.push({
          number: chapters.length + 1,
          title: match[1],
          pageStart: page.pageNumber,
          pageEnd: 0,
          confidence: 0.5
        })
      }
    }
  })
  
  // Fill in pageEnd values
  for (let i = 0; i < chapters.length; i++) {
    if (i < chapters.length - 1) {
      chapters[i].pageEnd = chapters[i + 1].pageStart - 1
    } else {
      chapters[i].pageEnd = pages[pages.length - 1].pageNumber
    }
  }
  
  // Filter low confidence if we have high confidence chapters
  const hasHighConfidence = chapters.some(c => c.confidence > 0.8)
  if (hasHighConfidence) {
    return chapters.filter(c => c.confidence > 0.6)
  }
  
  return chapters
}
```

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### 1. PDF Rendering - Virtualization
```typescript
// Only render visible pages + 2 buffer pages

const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3])

const handleScroll = useCallback((event: UIEvent) => {
  const container = event.target as HTMLDivElement
  const scrollTop = container.scrollTop
  const pageHeight = 1100 // average page height
  
  const currentPage = Math.floor(scrollTop / pageHeight) + 1
  const newVisiblePages = [
    Math.max(1, currentPage - 1),
    currentPage,
    Math.min(numPages, currentPage + 1),
    Math.min(numPages, currentPage + 2)
  ]
  
  setVisiblePages(newVisiblePages)
}, [numPages])

// Render
{visiblePages.map(pageNum => (
  <PDFPage key={pageNum} pageNumber={pageNum} />
))}
```

### 2. Search - Indexed Full-Text Search
```sql
-- PostgreSQL full-text search index
CREATE INDEX idx_content_search 
  ON textbook_content 
  USING GIN(to_tsvector('english', text_content));

-- Query
SELECT page_number, ts_headline('english', text_content, query) as snippet
FROM textbook_content, to_tsquery('english', 'quantum & mechanics') query
WHERE to_tsvector('english', text_content) @@ query
ORDER BY ts_rank(to_tsvector('english', text_content), query) DESC
LIMIT 20;
```

### 3. AI Generation - Batch & Cache
```typescript
// Generate summaries for multiple chapters in one API call

async function batchGenerateSummaries(chapterIds: string[]) {
  const chapters = await Promise.all(
    chapterIds.map(id => getChapterContent(id))
  )
  
  // Single API call with multiple chapters
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: 'Summarize each chapter below. Return JSON array.'
      },
      {
        role: 'user',
        content: JSON.stringify(chapters)
      }
    ]
  })
  
  // Cache results
  const summaries = JSON.parse(completion.choices[0].message.content)
  await Promise.all(
    summaries.map((summary, idx) => 
      cacheSummary(chapterIds[idx], summary)
    )
  )
}
```

### 4. Notes - Optimistic Updates
```typescript
// Update UI immediately, sync to DB in background

const updateNote = async (id: string, content: string) => {
  // 1. Update local state immediately
  setNotes(prev => prev.map(n => 
    n.id === id ? { ...n, content, updated_at: new Date() } : n
  ))
  
  // 2. Sync to DB (don't await)
  supabase.from('notes').update({ content }).eq('id', id)
    .catch(error => {
      // Rollback on error
      setNotes(prev => prev.map(n => 
        n.id === id ? { ...n, content: originalContent } : n
      ))
      toast.error('Failed to save note')
    })
}
```

---

## 🔐 SECURITY CONSIDERATIONS

### 1. Row Level Security (RLS)
- **Enforced**: All tables have RLS enabled
- **Policy**: Users can only access their own data
- **Service Role**: Edge Functions use service role for trusted operations

### 2. API Key Protection
- **Storage**: Environment variables only
- **Rotation**: Monthly rotation schedule
- **Rate Limiting**: 100 requests/minute per user

### 3. File Upload Security
- **Validation**: Check file type (PDF only), max size (50MB)
- **Virus Scan**: ClamAV integration (future)
- **Signed URLs**: Temporary access tokens for downloads

---

## 📊 MONITORING & ANALYTICS

### Key Metrics:
1. **Performance**:
   - PDF load time
   - Page render time
   - API response time
   
2. **Usage**:
   - Active users
   - Textbooks uploaded
   - Notes created
   - AI generations triggered
   
3. **Costs**:
   - OpenAI API spend per user
   - Storage costs
   - Bandwidth

### Tools:
- **Error Tracking**: Sentry
- **Analytics**: PostHog (privacy-focused)
- **Logs**: Supabase Logs + Edge Function logs

---

This technical architecture is now **LOCKED** and ready for implementation.

Version: 1.0
Last Updated: October 10, 2025

