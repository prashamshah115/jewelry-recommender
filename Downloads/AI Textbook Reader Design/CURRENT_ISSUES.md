# 🚨 CURRENT ISSUES - Priority Fixes Needed

**Last Updated:** October 10, 2025
**Status:** Issues identified, solutions proposed below

---

## 🔴 CRITICAL ISSUES

### 1. Chat Context is Insufficient
**Problem:**
- Chat is not receiving appropriate context from the current page
- May not include chapter summary or relevant page text
- Responses may be generic or miss important details

**Impact:** High - Core feature not working as intended

**Root Cause:**
- ChatContext may not be fetching full page text
- Chapter summary integration may be incomplete
- Context window too small or improperly formatted

**Solution:**
- [ ] Update ChatContext to include:
  - Full current page text (not just excerpt)
  - Surrounding pages context (page-1, page+1)
  - Current chapter summary (if generated)
  - User's current notes for this page
- [ ] Increase context sent to OpenAI
- [ ] Add visual indicator showing what context is being used

---

### 2. Background Processing Still Hindering Recall Generation
**Problem:**
- User clicks "Generate for This Page" but it fails
- Error: "Page text not extracted yet"
- Background text extraction is still timing out
- Users can't generate content even though PDF is visible

**Impact:** High - Main redesign feature not working

**Root Cause:**
- Background PDF text extraction (`/api/extract-pdf-text`) still runs on upload
- It times out on Vercel free tier for large PDFs
- Pages table remains empty
- On-demand generation depends on pages table having text

**Solution:**
- [ ] **Option A: Remove background extraction entirely**
  - Extract text on-demand when user clicks "Generate"
  - Use pdf.js to extract single page on the fly
  - Cache extracted text in pages table
  
- [ ] **Option B: Hybrid approach**
  - Try background extraction (non-blocking)
  - If user clicks "Generate" before extraction done:
    - Extract that single page on-demand
    - Generate content immediately
    - Continue background extraction for other pages

**Recommended:** Option B (best of both worlds)

---

### 3. Freezing and Reloading Issue Persists
**Problem:**
- App freezes after being idle
- Sometimes requires page reload to work again
- Loading states get stuck
- UI becomes unresponsive

**Impact:** High - Poor user experience, frustration

**Root Cause:**
- Session timeout fixes may not be working 100%
- React state management issues (stale closures)
- Supabase client connection drops
- Memory leaks in PDF renderer or contexts

**Specific Scenarios:**
1. Idle for 5+ minutes → Click next page → Stuck loading
2. Switch tabs in browser → Come back → App frozen
3. Generate content → Loading never completes

**Solution:**
- [ ] Add session heartbeat (ping every 2 minutes to keep alive)
- [ ] Add connection recovery logic in all contexts
- [ ] Add automatic page reload on fatal errors
- [ ] Add "Refresh App" button in header for quick recovery
- [ ] Implement proper cleanup in useEffect hooks
- [ ] Add error boundaries to catch and recover from crashes

---

## 🟡 MEDIUM PRIORITY ISSUES

### 4. Landing Screen Needs Redesign
**Problem:**
- Current landing/login screen is generic
- Should say "Welcome to a new way to read" or similar
- No onboarding or value proposition shown
- Doesn't set expectations for what the app does

**Impact:** Medium - First impression matters

**Solution:**
- [ ] Design new landing page with:
  - Hero text: "Welcome to a new way to read"
  - Subtitle explaining the value proposition
  - Visual preview of the app interface
  - Quick feature highlights (AI explanations, practice questions, smart notes)
  - Clear call-to-action for sign in/sign up
- [ ] Add onboarding flow for first-time users
- [ ] Show example of how it works before sign-up

---

### 5. PDF Upload Experience Unclear
**Problem:**
- Users don't know what's happening after upload
- "Text extraction in progress" vs "Ready to use" is confusing
- No clear indication when AI features are available
- Users may think app is broken when generation fails

**Impact:** Medium - Confusing UX

**Solution:**
- [ ] Better upload progress UI:
  - Step 1: Uploading PDF... ✅
  - Step 2: PDF Ready - You can start reading! ✅
  - Step 3: Extracting text (optional - happens in background)
  - Step 4: AI features ready (shows when extraction completes)
- [ ] Clear messaging: "Your PDF is ready! Background processing continues for AI features."
- [ ] Show toast when background processing completes
- [ ] If extraction fails, show: "AI features unavailable, but you can still read and take notes"

---

### 6. No Visual Feedback on Long Operations
**Problem:**
- "Generate for This Page" can take 2-3 seconds
- Users may click multiple times (spam)
- No progress indication for what's happening
- Unclear if operation is working or stuck

**Impact:** Medium - User confusion

**Solution:**
- [ ] Add progress indicators:
  - "Analyzing page text..."
  - "Generating applications..."
  - "Creating practice questions..."
- [ ] Disable button during generation (already done)
- [ ] Show estimated time (2-3 seconds)
- [ ] Add animation or progress bar

---

## 🟢 LOW PRIORITY ISSUES

### 7. No Keyboard Shortcuts
**Problem:**
- All navigation requires mouse clicks
- Power users want keyboard shortcuts
- Arrow keys for page navigation already work
- But no shortcuts for AI features, notes, etc.

**Impact:** Low - Nice to have

**Solution:**
- [ ] Add keyboard shortcuts:
  - `N` - New note
  - `G` - Generate content for current page
  - `C` - Focus chat input
  - `/` - Search
  - `←` / `→` - Previous/Next page (already works?)
  - `Cmd+K` - Command palette

---

### 8. No Search Functionality
**Problem:**
- Users can't search within the textbook
- Can't search their notes
- Have to manually navigate to find content

**Impact:** Low - Can work without it, but limiting

**Solution:**
- [ ] Implement search:
  - Search pages table for text
  - Search user_notes for content
  - Show results with page numbers
  - Click to navigate to page

---

### 9. No Mobile Responsiveness
**Problem:**
- Three-column layout doesn't work on mobile
- PDF viewer may not render well on small screens
- Touch gestures not optimized

**Impact:** Low - Desktop app for now

**Solution:**
- [ ] Mobile-first redesign:
  - Tabs instead of columns on mobile
  - Bottom sheet for AI features
  - Swipe for page navigation
  - Optimized touch targets

---

### 10. No Export/Share Features
**Problem:**
- Can't export practice questions
- Can't share generated content with others
- Notes export is basic (Markdown/Text only)

**Impact:** Low - Nice to have

**Solution:**
- [ ] Add export options:
  - Export as Anki flashcards
  - Export as PDF study guide
  - Share link to specific page content
  - Collaborative note-taking

---

## 📊 ISSUE TRACKER

| # | Issue | Priority | Status | Estimated Fix Time |
|---|-------|----------|--------|-------------------|
| 1 | Chat context insufficient | 🔴 Critical | Open | 1 hour |
| 2 | Background processing hindering recall | 🔴 Critical | Open | 2 hours |
| 3 | Freezing/reloading persists | 🔴 Critical | Open | 3 hours |
| 4 | Landing screen redesign | 🟡 Medium | Open | 1 hour |
| 5 | Upload experience unclear | 🟡 Medium | Open | 1 hour |
| 6 | No visual feedback on long ops | 🟡 Medium | Open | 30 mins |
| 7 | No keyboard shortcuts | 🟢 Low | Open | 1 hour |
| 8 | No search functionality | 🟢 Low | Open | 2 hours |
| 9 | No mobile responsiveness | 🟢 Low | Open | 4 hours |
| 10 | No export/share features | 🟢 Low | Open | 2 hours |

---

## 🎯 RECOMMENDED ACTION PLAN

### Phase 1: Critical Fixes (Do First) - ~6 hours
1. ✅ Fix background processing to not block recall generation (2 hours)
   - Implement on-demand text extraction fallback
2. ✅ Fix freezing/reloading issue (3 hours)
   - Add session heartbeat
   - Add connection recovery
   - Add error boundaries
3. ✅ Fix chat context (1 hour)
   - Include full page text + chapter summary

### Phase 2: UX Improvements - ~2.5 hours
4. Landing screen redesign (1 hour)
5. Upload progress clarity (1 hour)
6. Visual feedback on generation (30 mins)

### Phase 3: Nice-to-Haves - ~9 hours
7. Keyboard shortcuts (1 hour)
8. Search functionality (2 hours)
9. Mobile responsiveness (4 hours)
10. Export/share features (2 hours)

---

## 🔧 TECHNICAL DEBT

### Code Quality Issues:
- [ ] Too many useEffect hooks - refactor contexts
- [ ] State management could use Zustand/Redux
- [ ] PDF rendering performance could be optimized
- [ ] API error handling inconsistent across endpoints
- [ ] No integration tests
- [ ] No E2E tests

### Infrastructure Issues:
- [ ] Vercel free tier limitations (10s timeout)
- [ ] No monitoring/logging (Sentry, LogRocket)
- [ ] No analytics (PostHog, Mixpanel)
- [ ] No error tracking
- [ ] No performance monitoring

### Security Issues:
- [ ] API keys exposed in client-side code? (Check)
- [ ] RLS policies need audit
- [ ] Rate limiting on API endpoints needed
- [ ] Input sanitization for chat/notes

---

## 💡 PROPOSED SOLUTIONS SUMMARY

### For Issue #2 (Background Processing):
**Best Solution:** Hybrid text extraction
```typescript
// In generate-page-content.ts
if (!pageText) {
  // Try to extract this single page on-demand
  const singlePageText = await extractSinglePageText(textbookId, pageNumber);
  // Cache it for future
  await savePage(textbookId, pageNumber, singlePageText);
  // Continue with generation
}
```

### For Issue #3 (Freezing):
**Best Solution:** Session heartbeat + recovery
```typescript
// Add to AuthContext
useEffect(() => {
  const heartbeat = setInterval(async () => {
    const { error } = await supabase.auth.getSession();
    if (error) {
      await supabase.auth.refreshSession();
    }
  }, 120000); // Every 2 minutes
  
  return () => clearInterval(heartbeat);
}, []);
```

### For Issue #1 (Chat Context):
**Best Solution:** Rich context builder
```typescript
// In ChatContext
const buildContext = () => {
  return {
    currentPage: currentPageData?.raw_text,
    previousPage: previousPageData?.raw_text,
    nextPage: nextPageData?.raw_text,
    chapterSummary: currentChapterSummary,
    userNotes: activeNote?.content,
    generatedApplications: currentAIContent?.applications,
  };
};
```

---

## 🎯 WHAT TO PRIORITIZE RIGHT NOW

**If you want a working MVP for users TODAY:**
1. Fix Issue #2 (background processing) - This is blocking core functionality
2. Fix Issue #3 (freezing) - This makes app unusable
3. Fix Issue #1 (chat context) - This improves core value prop

**Total time:** ~6 hours

**After that, you have a solid, usable app.**

---

## 📝 NOTES

- Some "bugs" may actually be Vercel free tier limitations
- Consider upgrading to Vercel Pro ($20/mo) if issues persist
- Railway.app alternative for long-running operations
- May need to set expectations: "Works best on desktop, Chrome browser"

---

**Want me to start fixing these? Switch to agent mode and I'll tackle the critical issues first.**


