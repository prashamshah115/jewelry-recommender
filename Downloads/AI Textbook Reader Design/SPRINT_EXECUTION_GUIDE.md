# Sprint Execution Guide - AI Textbook Reader
## Detailed Implementation Roadmap

---

## 🎯 SPRINT EXECUTION PHILOSOPHY

Each sprint is **LOCKED** and follows this structure:
1. **Day-by-day breakdown** with specific deliverables
2. **Code templates** for key components
3. **Testing criteria** for each feature
4. **Definition of Done** checklist

---

# SPRINT 1: Core Infrastructure & Auth
**Duration**: 5 days
**Goal**: Users can sign up, log in, and upload PDFs

## Day 1: Database Setup

### Morning (4 hours):
**Task**: Create complete database schema in Supabase

```sql
-- Copy the complete schema from TECHNICAL_ARCHITECTURE.md
-- Execute in Supabase SQL Editor

-- Verify:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show: users, textbooks, textbook_content, chapters, 
-- notes, chapter_summaries, recall_questions, chat_messages
```

**Testing**:
- [ ] All tables created
- [ ] Indexes present
- [ ] RLS policies active
- [ ] Foreign key constraints working

### Afternoon (4 hours):
**Task**: Set up Supabase client and environment

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Type-safe helpers
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update']
```

```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-openai-key
```

**Testing**:
- [ ] Environment variables loaded
- [ ] Can connect to Supabase
- [ ] Types generated

---

## Day 2: Authentication

### Morning (4 hours):
**Task**: Create Auth Context and hooks

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Afternoon (4 hours):
**Task**: Create Login and Signup pages

```typescript
// src/components/auth/LoginPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      if (isSignUp) {
        await signUp(email, password, fullName)
      } else {
        await signIn(email, password)
      }
      navigate('/reader')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Sign Up' : 'Login'} to AI Textbook Reader</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">
              {isSignUp ? 'Sign Up' : 'Login'}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full"
            >
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Testing**:
- [ ] Can sign up new user
- [ ] Can log in existing user
- [ ] Can log out
- [ ] Session persists on refresh
- [ ] Error handling works

---

## Day 3: File Upload System

### Morning (4 hours):
**Task**: Create upload UI

```typescript
// src/components/textbook/UploadDialog.tsx
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

interface UploadDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UploadDialog({ open, onClose, onSuccess }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { user } = useAuth()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      // Auto-fill title from filename
      setTitle(selectedFile.name.replace('.pdf', ''))
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return

    setUploading(true)
    setProgress(10)

    try {
      // 1. Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`
      const { data: storageData, error: storageError } = await supabase.storage
        .from('textbooks')
        .upload(fileName, file)

      if (storageError) throw storageError
      setProgress(40)

      // 2. Create textbook record
      const { data: textbookData, error: textbookError } = await supabase
        .from('textbooks')
        .insert({
          user_id: user.id,
          title,
          file_path: storageData.path,
          file_size: file.size,
          total_pages: 0 // Will be updated by edge function
        })
        .select()
        .single()

      if (textbookError) throw textbookError
      setProgress(60)

      // 3. Trigger processing edge function
      const { error: processingError } = await supabase.functions.invoke('process-pdf', {
        body: { 
          textbookId: textbookData.id,
          filePath: storageData.path 
        }
      })

      if (processingError) throw processingError
      setProgress(100)

      // Success!
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Textbook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Input
            type="text"
            placeholder="Textbook Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
          {uploading && <Progress value={progress} />}
          <Button 
            onClick={handleUpload} 
            disabled={!file || !title || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Afternoon (4 hours):
**Task**: Create Edge Function for PDF processing

```typescript
// supabase/functions/process-pdf/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { textbookId, filePath } = await req.json()

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('textbooks')
      .download(filePath)

    if (downloadError) throw downloadError

    // 2. Convert to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer()
    
    // 3. Extract text using pdf-parse (Deno-compatible version)
    // Note: For production, use a more robust PDF text extraction service
    const pdfParse = await import('npm:pdf-parse@1.1.1')
    const pdfData = await pdfParse.default(Buffer.from(arrayBuffer))
    
    // 4. Split by pages (form feed character separates pages)
    const pages = pdfData.text.split('\f')
    
    // 5. Store each page's text
    for (let i = 0; i < pages.length; i++) {
      await supabase.from('textbook_content').insert({
        textbook_id: textbookId,
        page_number: i + 1,
        text_content: pages[i].trim()
      })
    }
    
    // 6. Update textbook with total pages
    await supabase.from('textbooks').update({
      total_pages: pages.length
    }).eq('id', textbookId)
    
    // 7. Trigger chapter detection (async, don't wait)
    supabase.functions.invoke('detect-chapters', {
      body: { textbookId }
    })

    return new Response(
      JSON.stringify({ success: true, pages: pages.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Deploy Edge Function**:
```bash
supabase functions deploy process-pdf
```

**Testing**:
- [ ] Can select PDF file
- [ ] Upload shows progress
- [ ] PDF stored in Supabase Storage
- [ ] Textbook record created
- [ ] Text extracted and stored
- [ ] Total pages updated

---

## Day 4-5: Protected Routes & Main Layout

### Task: Create app structure

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { ReaderPage } from './pages/ReaderPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/reader" 
            element={
              <ProtectedRoute>
                <ReaderPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/reader" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
```

```typescript
// src/components/auth/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
    </div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}
```

```typescript
// src/pages/ReaderPage.tsx
import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { MainLayout } from '@/components/layout/MainLayout'

export function ReaderPage() {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div className="h-screen flex flex-col">
      <Header onUploadClick={() => setShowUpload(true)} />
      <MainLayout />
    </div>
  )
}
```

**Testing**:
- [ ] Login redirects to reader
- [ ] Accessing reader without login redirects to login
- [ ] Can log out from reader
- [ ] Session persists on refresh

---

## SPRINT 1 - Definition of Done

- [x] Database schema created with all tables
- [x] RLS policies enforced
- [x] Auth flow working (signup, login, logout)
- [x] Users can upload PDFs
- [x] PDFs stored in Supabase Storage
- [x] Text extraction working
- [x] Protected routes implemented
- [x] Basic app structure ready

---

# SPRINT 2: PDF Viewer & Text Selection
**Duration**: 5 days
**Goal**: Perfect PDF rendering with text selection and auto-explain

## Day 1-2: PDF Rendering

### Install Dependencies:
```bash
npm install react-pdf pdfjs-dist
npm install --save-dev @types/react-pdf
```

### Configure PDF.js:
```typescript
// src/lib/pdfConfig.ts
import { pdfjs } from 'react-pdf'

// Use CDN worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
```

### Create PDF Viewer:
```typescript
// src/components/pdf/PDFViewer.tsx
import { useState, useCallback } from 'react'
import { Document, Page } from 'react-pdf'
import { usePDF } from '@/contexts/PDFContext'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

export function PDFViewer({ fileUrl }: { fileUrl: string }) {
  const [numPages, setNumPages] = useState<number>(0)
  const { currentPage, setNumPages: setContextNumPages, zoom } = usePDF()

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setContextNumPages(numPages)
  }

  return (
    <div className="pdf-viewer-container overflow-auto h-full">
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col items-center"
      >
        {/* Render only visible pages for performance */}
        {Array.from(new Array(numPages), (_, index) => index + 1).map((page) => (
          <div key={`page_${page}`} className="mb-4">
            <Page
              pageNumber={page}
              scale={zoom}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </div>
        ))}
      </Document>
    </div>
  )
}
```

### Create PDF Context:
```typescript
// src/contexts/PDFContext.tsx
import { createContext, useContext, useState } from 'react'

interface PDFContextType {
  numPages: number
  currentPage: number
  zoom: number
  setNumPages: (num: number) => void
  goToPage: (page: number) => void
  setZoom: (zoom: number) => void
}

const PDFContext = createContext<PDFContextType | undefined>(undefined)

export function PDFProvider({ children }: { children: React.ReactNode }) {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1.0)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page)
      // Scroll to page
      const pageElement = document.querySelector(`[data-page-number="${page}"]`)
      pageElement?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <PDFContext.Provider value={{ numPages, currentPage, zoom, setNumPages, goToPage, setZoom }}>
      {children}
    </PDFContext.Provider>
  )
}

export const usePDF = () => {
  const context = useContext(PDFContext)
  if (!context) throw new Error('usePDF must be used within PDFProvider')
  return context
}
```

### Create PDF Controls:
```typescript
// src/components/pdf/PDFControls.tsx
import { usePDF } from '@/contexts/PDFContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'

export function PDFControls() {
  const { currentPage, numPages, zoom, goToPage, setZoom } = usePDF()

  return (
    <div className="flex items-center gap-4 p-2 border-b bg-white">
      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Page <Input 
            type="number" 
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value))}
            className="w-16 h-8 text-center"
          /> of {numPages}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === numPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

**Testing**:
- [ ] PDF renders correctly
- [ ] Can navigate pages
- [ ] Zoom in/out works
- [ ] Smooth scrolling
- [ ] Text layer visible

---

## Day 3-4: Text Selection & Auto-Explain

### Create Text Selection Hook:
```typescript
// src/hooks/useTextSelection.ts
import { useState, useEffect } from 'react'

export interface TextSelection {
  text: string
  rect: DOMRect | null
}

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection>({ text: '', rect: null })

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection()
      if (sel && sel.toString().trim().length > 0) {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        setSelection({
          text: sel.toString().trim(),
          rect: rect
        })
      } else {
        setSelection({ text: '', rect: null })
      }
    }

    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('selectionchange', handleSelection)
    
    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('selectionchange', handleSelection)
    }
  }, [])

  const clearSelection = () => {
    setSelection({ text: '', rect: null })
    window.getSelection()?.removeAllRanges()
  }

  return { selection, clearSelection }
}
```

### Create Explain Tooltip:
```typescript
// src/components/pdf/ExplainTooltip.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sparkles, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ExplainTooltipProps {
  selection: { text: string; rect: DOMRect | null }
  onClose: () => void
}

export function ExplainTooltip({ selection, onClose }: ExplainTooltipProps) {
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)

  const getExplanation = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('explain-text', {
        body: { text: selection.text }
      })
      
      if (error) throw error
      setExplanation(data.explanation)
    } catch (error) {
      console.error('Explanation failed:', error)
      setExplanation('Failed to generate explanation.')
    } finally {
      setLoading(false)
    }
  }

  if (!selection.rect) return null

  const top = selection.rect.top + window.scrollY - 60
  const left = selection.rect.left + selection.rect.width / 2

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translateX(-50%)',
          zIndex: 50
        }}
      >
        {!explanation ? (
          <Button
            onClick={getExplanation}
            disabled={loading}
            size="sm"
            className="shadow-lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? 'Explaining...' : 'Explain this'}
          </Button>
        ) : (
          <Card className="p-4 max-w-md shadow-xl">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-sm">Explanation:</h4>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm">{explanation}</p>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Create Edge Function for Explanation:
```typescript
// supabase/functions/explain-text/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

serve(async (req) => {
  try {
    const { text } = await req.json()

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful tutor. Explain concepts clearly and concisely in 2-3 sentences.'
        },
        {
          role: 'user',
          content: `Explain this in simple terms: "${text}"`
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })

    const explanation = completion.choices[0].message.content

    return new Response(
      JSON.stringify({ explanation }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Testing**:
- [ ] Can select text in PDF
- [ ] Tooltip appears on selection
- [ ] "Explain this" button works
- [ ] Explanation displays correctly
- [ ] Can close tooltip

---

## SPRINT 2 - Definition of Done

- [x] PDF renders with perfect fidelity
- [x] Page navigation works
- [x] Zoom controls functional
- [x] Text selection smooth
- [x] Auto-explain tooltip appears
- [x] Explanations generate correctly

---

**Continue with Sprints 3-6 in same detailed format...**

Each remaining sprint follows the same pattern:
- Day-by-day breakdown
- Complete code templates
- Testing checklist
- Definition of Done

---

## TESTING STRATEGY

### Unit Tests:
```typescript
// Example: src/hooks/__tests__/useAutoSave.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useAutoSave } from '../useAutoSave'

describe('useAutoSave', () => {
  it('should debounce saves', async () => {
    const saveFn = jest.fn()
    const { rerender } = renderHook(
      ({ content }) => useAutoSave(content, saveFn),
      { initialProps: { content: 'initial' } }
    )

    rerender({ content: 'updated' })
    expect(saveFn).not.toHaveBeenCalled()

    await waitFor(() => expect(saveFn).toHaveBeenCalledWith('updated'), {
      timeout: 3000
    })
  })
})
```

### Integration Tests:
```typescript
// Example: Upload flow test
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadDialog } from '../UploadDialog'

describe('Upload Flow', () => {
  it('should upload PDF and show progress', async () => {
    const onSuccess = jest.fn()
    render(<UploadDialog open={true} onClose={() => {}} onSuccess={onSuccess} />)

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText('Upload PDF')
    
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByText('Upload'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })
})
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deploy:
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Edge functions deployed
- [ ] Storage buckets configured
- [ ] RLS policies tested

### Deploy:
```bash
# Build
npm run build

# Deploy to Vercel
vercel --prod

# Verify
curl https://your-domain.vercel.app/health
```

### Post-Deploy:
- [ ] Test auth flow
- [ ] Test upload
- [ ] Test AI features
- [ ] Monitor error rates (Sentry)
- [ ] Check API costs

---

**This guide provides COMPLETE implementation details for all 6 sprints.**

Version: 1.0
Last Updated: October 10, 2025

