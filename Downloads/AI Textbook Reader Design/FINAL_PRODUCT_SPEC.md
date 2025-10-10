# AI Textbook Reader - Final Product Specification
## 6-Sprint Implementation Plan

---

## 🎯 PRODUCT VISION

A focused AI-powered textbook reader that enhances learning through smart note-taking, chapter summaries, recall questions, and context-aware chat assistance. Zero collaboration, maximum individual learning.

---

## 📐 SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        MAIN SCREEN                          │
├──────────────┬─────────────────────┬────────────────────────┤
│   NOTES      │    PDF VIEWER       │    AI ASSISTANCE       │
│   PANEL      │    (Center)         │    PANEL               │
│   (Left)     │                     │    (Right)             │
│              │                     │                        │
│ • Personal   │ • PDF Rendering     │ • Summary (Per Ch)     │
│   Notes      │ • Scroll & Zoom     │ • Recall (Per Ch)      │
│ • Auto-save  │ • Text Selection    │ • Chat (Context-aware) │
│ • Export     │ • Page Navigation   │                        │
│ • Multiple   │ • Auto-explain      │                        │
│   Notes      │   Tooltip           │                        │
└──────────────┴─────────────────────┴────────────────────────┘
         ▲                                      ▲
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                  ┌─────┴─────┐
                  │  Supabase │
                  │  Backend  │
                  └───────────┘
                  • User Auth
                  • PDF Storage
                  • Notes Storage
                  • AI Content Cache
```

---

## 🔑 KEY ARCHITECTURAL DECISIONS

### Decision 1: PDF Rendering Strategy
**CHOSEN: PDF.js with React-PDF wrapper**
- **Why**: Industry standard, maintains exact PDF formatting, handles complex layouts
- **Tradeoff**: Heavier bundle size vs perfect fidelity
- **Alternative Rejected**: HTML conversion (loses formatting)
- **Implementation**: `react-pdf` library with custom text layer for selection

### Decision 2: Notes Storage Architecture
**CHOSEN: Document-per-note with chapter/page metadata**
```sql
notes {
  id: uuid
  user_id: uuid
  textbook_id: uuid
  chapter_number: int
  page_start: int
  page_end: int
  title: string
  content: text (Markdown)
  created_at: timestamp
  updated_at: timestamp
}
```
- **Why**: Flexible, supports multiple notes per chapter, easy to query
- **Auto-save**: Debounced saves every 2 seconds on edit
- **Export**: Markdown → PDF via jsPDF or browser print

### Decision 3: Textbook Management
**CHOSEN: Multi-textbook selection with active textbook state**
```sql
textbooks {
  id: uuid
  user_id: uuid
  title: string
  file_path: string (Supabase Storage)
  upload_date: timestamp
  last_opened: timestamp
  total_pages: int
  current_page: int (user bookmark)
}
```
- **UI**: Dropdown selector in header + "Manage Textbooks" modal
- **Storage**: Supabase Storage with CDN delivery
- **Delete**: Soft delete with cascade to notes/AI content

### Decision 4: Search Bar Decision
**CHOSEN: YES - Keep full-text search**
- **Why**: Essential for academic reading (find definitions, formulas, references)
- **Scope**: 
  - Search within current textbook
  - Highlight matches in PDF
  - Jump to page with match
- **Implementation**: Index PDF text on upload, store in `textbook_content` table

### Decision 5: AI Content Generation Strategy
**CHOSEN: Chapter-based progressive generation with caching**

#### Summary System:
```sql
chapter_summaries {
  id: uuid
  textbook_id: uuid
  chapter_number: int
  title: string
  summary_text: text
  key_concepts: jsonb[]
  generated_at: timestamp
}
```
- **Trigger**: When user scrolls past 50% of chapter OR navigates to new chapter
- **Model**: OpenAI GPT-4-turbo (cost-effective, high quality)
- **Caching**: Store in DB, regenerate only on explicit user request

#### Recall System:
```sql
recall_questions {
  id: uuid
  textbook_id: uuid
  chapter_number: int
  question: text
  answer: text
  difficulty: enum('easy', 'medium', 'hard')
  order_index: int
}
```
- **Generation**: 8-10 questions per chapter
- **UI**: Collapsible question cards, click to reveal answer
- **Progressive**: Generate as user reads, show loading state

#### Chat System:
**Context Construction**:
```typescript
const context = {
  textbook_metadata: { title, author, subject },
  current_chapter: chapter_summaries[current_chapter],
  current_page_text: extracted_text[current_page],
  last_3_messages: chat_history.slice(-3)
}
```
- **Model**: OpenAI GPT-4-turbo
- **Max tokens**: 2048 response
- **System prompt**: "You are an expert tutor for [textbook_title]..."

### Decision 6: Remove AI Context Toggle
**CHOSEN: REMOVED - Always use maximum available context**
- **Why**: Simplifies UX, context is cheap with GPT-4-turbo
- **Default behavior**: Always include current page + chapter summary

---

## 🚀 6-SPRINT IMPLEMENTATION PLAN

### **SPRINT 1: Core Infrastructure & Auth** (Week 1)
**Goal**: Solid foundation with authentication and data models

#### Tasks:
1. **Database Schema** (Day 1-2)
   - Create `users`, `textbooks`, `notes`, `chapter_summaries`, `recall_questions`, `chat_messages` tables
   - Set up RLS policies
   - Create indexes for performance

2. **Authentication** (Day 2-3)
   - Supabase Auth integration
   - Login/Signup pages
   - Protected route wrapper
   - Session management

3. **File Upload System** (Day 3-5)
   - PDF upload to Supabase Storage
   - Metadata extraction (page count, title)
   - Text extraction service (pdf-parse)
   - Store in `textbook_content` table

**Deliverables**:
- ✅ All database tables created
- ✅ Auth flow working
- ✅ Users can upload PDFs
- ✅ PDFs stored and retrievable

**Testing**:
- Upload 3 different PDFs
- Verify auth flow
- Check RLS policies

---

### **SPRINT 2: PDF Viewer & Text Selection** (Week 2)
**Goal**: Perfect PDF rendering with smooth interaction

#### Tasks:
1. **PDF Rendering** (Day 1-3)
   - Integrate `react-pdf`
   - Implement page-by-page rendering
   - Add scroll virtualization for performance
   - Zoom controls (fit-width, fit-page, custom %)

2. **Text Selection** (Day 3-4)
   - Enable text layer in PDF.js
   - Custom selection styling
   - Copy to clipboard functionality
   - Selection position tracking for tooltip

3. **Auto-Explain Tooltip** (Day 4-5)
   - Detect text selection
   - Show floating tooltip
   - Call OpenAI API with context: `"Explain this in simple terms: {selected_text}"`
   - Display in beautiful popover

**Deliverables**:
- ✅ PDF renders perfectly
- ✅ Smooth scrolling
- ✅ Text selection works
- ✅ Auto-explain tooltip appears

**Key Optimization**:
- Render only visible pages + 2 buffer pages
- Use Web Workers for PDF parsing

---

### **SPRINT 3: Notes System** (Week 3)
**Goal**: Complete note-taking with auto-save and export

#### Tasks:
1. **Notes Panel UI** (Day 1-2)
   - Left panel with rich text editor (TipTap or Quill)
   - Chapter/page metadata input
   - "New Note" button
   - Notes list with preview

2. **Auto-Save Logic** (Day 2-3)
   - Debounced save (2 seconds after last edit)
   - Optimistic UI updates
   - Visual save indicator ("Saving..." → "Saved")
   - Conflict resolution (last-write-wins)

3. **Notes Management** (Day 3-4)
   - Display all notes for current textbook
   - Filter by chapter
   - Edit/delete notes
   - Timestamp display

4. **Export Feature** (Day 4-5)
   - Export single note as Markdown
   - Export all notes as PDF
   - Include metadata (chapter, date, textbook title)
   - Use jsPDF for PDF generation

**Deliverables**:
- ✅ Full notes CRUD
- ✅ Auto-save working
- ✅ Export to Markdown & PDF

**Edge Cases**:
- Handle offline auto-save (queue in localStorage)
- Prevent data loss on browser crash

---

### **SPRINT 4: Textbook Management** (Week 4)
**Goal**: Multi-textbook support with seamless switching

#### Tasks:
1. **Textbook Selector** (Day 1-2)
   - Dropdown in header with all uploaded textbooks
   - Show: title, last opened date, cover thumbnail
   - Switch textbook → reload PDF + notes + AI content

2. **Manage Textbooks Modal** (Day 2-3)
   - List all textbooks
   - Delete textbook (with confirmation)
   - Cascade delete: PDF file + notes + AI content
   - Upload new textbook from this modal

3. **Search Bar** (Day 3-5)
   - Full-text search within current textbook
   - Highlight matches in PDF
   - Navigate between matches (prev/next)
   - Search results panel with context snippets

**Deliverables**:
- ✅ Switch between textbooks
- ✅ Delete textbooks
- ✅ Search working with highlights

**Performance**:
- Lazy load textbook list
- Cache current textbook data in React Context

---

### **SPRINT 5: AI Features - Summary & Recall** (Week 5)
**Goal**: Intelligent chapter summaries and recall questions

#### Tasks:
1. **Chapter Detection** (Day 1)
   - Extract chapter boundaries from PDF
   - Use headings, page numbers, ToC
   - Store in `textbook_metadata` table

2. **Summary Generation** (Day 2-3)
   - Trigger: User reaches 50% of chapter
   - OpenAI API call with chapter text
   - Prompt: "Summarize this chapter in 200 words. Include key concepts."
   - Store in `chapter_summaries`
   - Display in collapsible card

3. **Summary UI** (Day 3)
   - Accordion component
   - Show: chapter title, summary, key concepts list
   - Regenerate button

4. **Recall Questions** (Day 4-5)
   - Generate 8-10 questions per chapter
   - Prompt: "Generate 8 recall questions with answers for this chapter"
   - Parse JSON response
   - UI: Question cards with click-to-reveal answers
   - Progressive disclosure animation

**Deliverables**:
- ✅ Auto-generate summaries
- ✅ Auto-generate recall questions
- ✅ Beautiful UI for both

**Optimization**:
- Batch API calls for multiple chapters
- Show skeleton loaders during generation

---

### **SPRINT 6: Chat & Polish** (Week 6)
**Goal**: Context-aware chat and final UX polish

#### Tasks:
1. **Chat System** (Day 1-3)
   - Chat panel UI (bottom of right sidebar)
   - Message history display
   - Input with send button
   - Context construction:
     ```typescript
     {
       textbook: current_textbook,
       chapter_summary: current_chapter_summary,
       page_text: current_page_text,
       user_message: message
     }
     ```
   - OpenAI streaming response
   - Store chat history in DB

2. **Remove AI Toggle** (Day 3)
   - Remove toggle button
   - Always use full context

3. **Final Polish** (Day 4-5)
   - Responsive design tweaks
   - Loading states everywhere
   - Error handling (API failures, upload errors)
   - Empty states (no textbooks, no notes)
   - Keyboard shortcuts (Ctrl+N for new note, Ctrl+F for search)

4. **Performance Optimization** (Day 5)
   - Code splitting
   - Lazy load panels
   - Optimize bundle size
   - Add service worker for offline support

5. **Testing & Bug Fixes** (Day 5-6)
   - End-to-end testing
   - Cross-browser testing
   - Mobile responsiveness

**Deliverables**:
- ✅ Fully functional chat
- ✅ Polished UX
- ✅ Performance optimized
- ✅ Production-ready

---

## 🎨 UI/UX SPECIFICATIONS

### Layout Proportions:
```
┌─────────────────────────────────────────────┐
│  Header (60px fixed)                        │
├────────┬────────────────────┬───────────────┤
│ Notes  │  PDF Viewer        │  AI Panel     │
│ 25%    │  50%               │  25%          │
│        │                    │               │
│        │  [Resizable]       │  [Resizable]  │
└────────┴────────────────────┴───────────────┘
```

### Header Components:
- **Left**: Logo + Textbook selector dropdown
- **Center**: Search bar (collapsible on small screens)
- **Right**: User menu (avatar, logout)

### Notes Panel:
- **Top**: "New Note" button + Filter dropdown
- **Middle**: Rich text editor (active note)
- **Bottom**: Notes list (scrollable)

### PDF Viewer:
- **Top**: Page navigation (1 of 234) + Zoom controls
- **Center**: PDF canvas
- **Interaction**: 
  - Scroll to navigate
  - Click + drag to select text
  - Double-click word to select + explain

### AI Panel:
- **Tabs**: Summary | Recall | Chat
- **Summary Tab**: 
  - Chapter selector dropdown
  - Summary card with key concepts
- **Recall Tab**:
  - Chapter selector
  - Question cards (click to flip)
- **Chat Tab**:
  - Message history (scrollable)
  - Input at bottom

---

## 🔧 TECHNICAL STACK

### Frontend:
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **State**: React Context + Zustand (for PDF state)
- **UI**: Tailwind CSS + shadcn/ui components
- **PDF**: react-pdf + pdf.js
- **Rich Text**: TipTap (for notes)
- **API**: React Query for data fetching

### Backend:
- **Platform**: Supabase
- **Auth**: Supabase Auth
- **Database**: PostgreSQL
- **Storage**: Supabase Storage (for PDFs)
- **Edge Functions**: For AI processing

### AI/ML:
- **Provider**: OpenAI
- **Models**: 
  - GPT-4-turbo (chat, summaries, questions)
  - text-embedding-3-small (for search)
- **Processing**: Edge Functions

### Deployment:
- **Hosting**: Vercel
- **CDN**: Vercel Edge Network
- **Environment**: 
  - Production
  - Staging (for testing)

---

## 📊 DATA FLOW DIAGRAMS

### Upload Flow:
```
User uploads PDF
  ↓
Store in Supabase Storage
  ↓
Extract text (pdf-parse)
  ↓
Store in textbook_content table
  ↓
Index for search
  ↓
Detect chapters
  ↓
Ready to read
```

### Reading Flow:
```
User opens textbook
  ↓
Load PDF from Storage
  ↓
Render current page
  ↓
User scrolls to new chapter
  ↓
Check if summary exists
  ↓
  No → Generate summary (background)
  Yes → Display cached summary
  ↓
Generate recall questions (background)
```

### Chat Flow:
```
User types message
  ↓
Construct context:
  - Current page text
  - Chapter summary
  - Textbook metadata
  ↓
Call OpenAI API
  ↓
Stream response
  ↓
Display in chat + Store in DB
```

---

## 🚨 CRITICAL DECISIONS SUMMARY

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| PDF Rendering | react-pdf | Perfect fidelity, industry standard |
| Notes Format | Markdown | Simple, exportable, future-proof |
| Auto-save Frequency | 2 seconds debounce | Balance UX vs DB load |
| Search Bar | Keep | Essential for academic use |
| AI Context Toggle | Remove | Simplify UX, always use full context |
| AI Generation Trigger | 50% chapter read | Balance cost vs user expectation |
| Chapter Detection | Heuristic + ML | Automatic, works for most textbooks |
| Export Format | Markdown + PDF | User flexibility |

---

## 🎯 SUCCESS METRICS

### Performance:
- PDF loads in < 2 seconds
- Page navigation < 100ms
- Search results < 500ms
- Auto-save < 200ms

### AI Quality:
- Summary accuracy: 90%+ (manual review)
- Recall questions relevance: 85%+
- Chat response time: < 5 seconds

### User Experience:
- Zero data loss (auto-save)
- < 3 clicks to any feature
- Mobile responsive (tablets minimum)

---

## 🔐 SECURITY & PRIVACY

1. **RLS Policies**: Users can only access their own data
2. **API Keys**: Stored in environment variables, never exposed
3. **File Access**: Signed URLs with expiration
4. **No Collaboration**: Complete data isolation between users

---

## 💰 COST ESTIMATION

### Per User/Month:
- **Storage**: $0.021/GB (10MB avg per textbook × 10 textbooks = 100MB = $0.002)
- **Database**: $0.05 (Supabase free tier covers most)
- **OpenAI API**:
  - Summaries: $0.03 per chapter (10 chapters/textbook = $0.30)
  - Recall: $0.02 per chapter ($0.20)
  - Chat: $0.01 per message (50 messages = $0.50)
  - **Total AI**: ~$1.00/month

**Total per user**: ~$1.10/month
**Target: 1000 users** = $1,100/month

---

## 🐛 EDGE CASES & HANDLING

1. **PDF Upload Fails**: Retry logic + clear error message
2. **AI Generation Fails**: Show cached version + regenerate option
3. **Search No Results**: Suggest alternative search terms
4. **Notes Sync Conflict**: Last-write-wins + backup in localStorage
5. **Large PDFs (>500 pages)**: Progressive loading + virtualization
6. **Non-English Textbooks**: OpenAI supports 50+ languages
7. **Scanned PDFs (no text layer)**: Show warning, suggest OCR service

---

## 🚀 FUTURE ENHANCEMENTS (Post-Launch)

1. **Spaced Repetition**: Schedule recall questions
2. **Highlighting**: Persistent highlights in PDF
3. **Flashcards**: Generate from key concepts
4. **Mobile App**: React Native version
5. **Offline Mode**: Service worker + IndexedDB
6. **OCR Support**: For scanned PDFs
7. **Multi-language**: i18n for UI

---

## ✅ LAUNCH CHECKLIST

### Pre-Launch:
- [ ] All sprints completed
- [ ] End-to-end testing
- [ ] Performance benchmarks met
- [ ] Security audit
- [ ] Error tracking (Sentry)
- [ ] Analytics (PostHog)

### Launch Day:
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Monitor API costs
- [ ] User onboarding flow tested

### Post-Launch:
- [ ] Gather user feedback
- [ ] Monitor performance
- [ ] Iterate on UX

---

## 📞 QUESTIONS FOR CLARIFICATION

1. **Chapter Detection**: Should we allow manual chapter boundary editing by users?
2. **Note Organization**: Should notes be organized hierarchically (textbook → chapter → note)?
3. **Export Options**: Any specific format preferences beyond Markdown/PDF?
4. **Search Scope**: Should search also include notes, or only textbook content?
5. **Recall Difficulty**: Should users rate question difficulty for adaptive learning?
6. **Chat History**: Keep forever or limit to last N messages per textbook?
7. **Mobile Priority**: Should we optimize for mobile from Sprint 1, or desktop-first?

---

## 📝 DEFINITION OF DONE

Each sprint is complete when:
1. ✅ All features implemented and tested
2. ✅ No critical bugs
3. ✅ Code reviewed and merged
4. ✅ Documentation updated
5. ✅ Performance benchmarks met
6. ✅ User acceptance testing passed

---

**This spec is now LOCKED. Any changes require explicit approval and re-planning.**

Last Updated: October 10, 2025
Version: 1.0 - FINAL

