# Server-Side PDF Processing Setup Guide

## Overview

Your app now uses **server-side PDF processing** instead of client-side extraction. This makes uploads instant and allows background processing of large PDFs.

## Architecture

```
User uploads PDF
    ↓
Upload to Supabase Storage (fast, ~1-2 seconds)
    ↓
Create textbook record (status: 'pending')
    ↓
Trigger /api/process-pdf endpoint
    ↓
Return immediately to user ✓
    ↓
Background processing extracts text
    ↓
Poll for status updates every 3 seconds
    ↓
Notify user when complete
```

## Setup Steps

### 1. Run Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add processing status columns to textbooks table
ALTER TABLE textbooks 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' 
  CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_textbooks_processing_status ON textbooks(processing_status);
CREATE INDEX IF NOT EXISTS idx_textbooks_user_status ON textbooks(user_id, processing_status);
```

### 2. Set Environment Variables

Add to your `.env` file:

```bash
# Existing
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# NEW: Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**⚠️ IMPORTANT:** The Service Role Key bypasses RLS. Keep it secret! Never expose it to the client.

You can find your Service Role Key in:
- Supabase Dashboard → Project Settings → API → `service_role` key

### 3. Deploy to Vercel

The API route at `api/process-pdf.ts` will automatically be deployed as a Vercel Serverless Function.

```bash
vercel deploy
```

### 4. Test the Upload

1. Click "Upload PDF" in your app
2. Select a PDF file
3. Fill in metadata
4. Click "Upload & Process"
5. You should see:
   - Upload completes in ~1-2 seconds
   - Toast: "Uploaded! Processing in background..."
   - Textbook appears in list with "Processing..." badge
   - Progress updates every 3 seconds
   - Toast: "Your textbook is ready!" when complete

## How It Works

### Upload Flow (`TextbookContext.tsx`)

```typescript
1. Upload PDF to Supabase Storage
2. Create textbook record with processing_status='pending'
3. Call /api/process-pdf endpoint
4. Start polling for status updates
5. Return immediately (user can continue using app)
```

### Processing API (`api/process-pdf.ts`)

```typescript
1. Fetch PDF from Supabase Storage
2. Update status to 'processing'
3. Extract text from each page using pdf.js
4. Batch insert pages to database (100 at a time)
5. Update progress every 10 pages
6. Update status to 'completed' when done
```

### Status Polling (`TextbookContext.tsx`)

```typescript
// Polls every 3 seconds
setInterval(() => {
  - Check processing_status
  - If 'completed' → notify user, load textbook
  - If 'failed' → show error
  - If 'processing' → update progress bar
}, 3000)
```

## Monitoring

### Check Processing Status

```sql
SELECT 
  id, 
  title, 
  processing_status, 
  processing_progress,
  processing_error,
  processing_started_at,
  processing_completed_at
FROM textbooks
WHERE processing_status != 'completed'
ORDER BY created_at DESC;
```

### View Processing Logs

Check Vercel Function Logs:
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Functions" tab
4. Click on `api/process-pdf`
5. View logs

## Troubleshooting

### Processing Stuck on "Pending"

**Cause:** API endpoint might have failed to start processing

**Fix:**
1. Check Vercel function logs for errors
2. Manually trigger processing:
   ```bash
   curl -X POST https://your-app.vercel.app/api/process-pdf \
     -H "Content-Type: application/json" \
     -d '{"textbookId": "xxx", "pdfUrl": "https://..."}'
   ```

### Processing Fails

**Common causes:**
- PDF is corrupted or password-protected
- PDF is too large (>50MB)
- Timeout (Vercel free tier has 10s limit)

**Fix:**
1. Check `processing_error` column
2. For large PDFs, upgrade Vercel plan or use Supabase Edge Functions

### Progress Not Updating

**Cause:** Polling might have stopped

**Fix:**
1. Refresh the page
2. Check browser console for errors
3. Verify Supabase connection

## Performance

### Current Implementation

- **Small PDFs (10-20 pages):** ~10-30 seconds
- **Medium PDFs (50-100 pages):** ~1-3 minutes
- **Large PDFs (200+ pages):** ~5-10 minutes

### Optimization Options

1. **Use Supabase Edge Functions** (Deno runtime, better for long-running tasks)
2. **Parallel processing** (process multiple pages simultaneously)
3. **Queue system** (Bull, AWS SQS) for better reliability
4. **Caching** (cache processed PDFs to avoid re-processing)

## Next Steps

- [ ] Run database migration
- [ ] Add Service Role Key to environment
- [ ] Deploy to Vercel
- [ ] Test upload with sample PDF
- [ ] Monitor first few uploads

## Benefits

✅ **Instant uploads** - No more waiting minutes for PDF extraction
✅ **Non-blocking** - Users can continue using app while processing
✅ **Better UX** - Progress updates and notifications
✅ **Scalable** - Server handles heavy lifting
✅ **Cancellable** - Close dialog without losing upload
✅ **Reliable** - Retries and error handling on server

Need help? Check the logs or contact support!

