# 📤 PDF Upload Feature - User Guide

Your AI Textbook Reader now has **full PDF upload functionality**! Here's how to use it.

---

## ✨ Features Implemented

### 1. **Drag & Drop Upload**
- Beautiful drag-and-drop interface
- File validation (PDF only, max 50MB)
- Real-time progress tracking

### 2. **Multiple Upload Locations**
- **Header**: Click "Select textbook" dropdown → "Upload New Textbook"
- **Empty State**: Large "Upload PDF" button when no textbook is loaded

### 3. **Smart Text Extraction**
- Automatic text extraction from all pages
- Progress indicator showing current page
- Handles multi-page PDFs efficiently

### 4. **Metadata Collection**
- Auto-fills title from PDF filename
- Optional subject field
- Optional learning goal (personalizes AI)

### 5. **Complete Upload Flow**
```
Select PDF → Fill Metadata → Upload & Extract → Save to Database → Open Textbook
```

---

## 🎯 How to Use

### **Method 1: From Header (When You Have Textbooks)**

1. Click the **textbook dropdown** in header
2. Scroll to bottom → click **"Upload New Textbook"**
3. Drag PDF or click to browse
4. Fill in metadata (title required)
5. Click **"Upload & Process"**
6. Wait for extraction (progress bar shows status)
7. Textbook opens automatically!

### **Method 2: From Empty State (First Time)**

1. You'll see empty state with large upload button
2. Click **"Upload PDF"**
3. Follow steps 3-7 above

---

## 📊 Upload Stages

The upload process has 4 stages with progress indicators:

1. **Uploading** (0-20%) - PDF uploads to Supabase Storage
2. **Extracting** (20-70%) - Text extracted from each page
3. **Saving** (70-100%) - Pages saved to database
4. **Done** ✅ - Textbook ready to read!

---

## 💡 Tips

### **For Best Results:**
- Use text-based PDFs (not scanned images)
- Keep files under 50MB
- Add a learning goal for personalized AI summaries

### **What's Stored:**
- Original PDF file (Supabase Storage)
- Extracted text from each page
- Metadata (title, subject, learning goal)
- Ready for AI processing

### **What Happens Next:**
- You can immediately start reading
- Notes auto-save as you type
- AI summaries generate when you load pages
- Chat works with current page context

---

## 🔧 Technical Details

### **File Processing**

```typescript
// Client-side extraction using pdf.js
1. Upload PDF → Supabase Storage
2. Extract text from each page
3. Store in 'pages' table
4. Link to 'textbooks' record
5. Ready for AI processing
```

### **Database Schema**

```sql
textbooks
├─ id (uuid)
├─ user_id (auth user)
├─ title (from metadata form)
├─ pdf_url (Supabase Storage)
├─ total_pages (detected from PDF)
└─ metadata (JSON with subject, learning_goal, etc.)

pages
├─ id (uuid)
├─ textbook_id (foreign key)
├─ page_number (1, 2, 3, ...)
├─ raw_text (extracted content)
└─ processed (false initially, true after AI)
```

### **Storage Structure**

```
textbook-pdfs/
  └─ {user_id}/
      └─ {textbook_id}.pdf
```

---

## ⚡ Performance

### **Speed**
- Upload: ~5-10 seconds for 10MB file
- Extraction: ~1-2 seconds per page
- **Example**: 50-page textbook = ~1-2 minutes total

### **Limits**
- Max file size: 50MB
- Max pages: 1000 (reasonable for most textbooks)
- Formats: PDF only

---

## 🚨 Error Handling

### **Common Errors**

**"File must be a PDF"**
→ Only PDF files are supported

**"PDF must be smaller than 50MB"**
→ Compress PDF or split into volumes

**"Failed to extract text from PDF"**
→ PDF might be corrupted or password-protected

**"Upload failed"**
→ Check internet connection, try again

### **Troubleshooting**

1. **Upload stuck?**
   - Check browser console (F12) for errors
   - Verify Supabase environment variables
   - Try smaller PDF first

2. **Text extraction incomplete?**
   - Some PDFs use images (no extractable text)
   - Try OCR tools to convert first
   - Or manually type important sections

3. **Can't see uploaded textbook?**
   - Refresh the page
   - Check textbook dropdown in header
   - Verify in Supabase dashboard → textbooks table

---

## 🎓 Example Workflow

### **Uploading Your First Textbook**

```
1. Open app → see "No textbook loaded"
2. Click "Upload PDF"
3. Select: deep-learning.pdf
4. Auto-fills: Title = "deep-learning"
5. Edit to: "Deep Learning Fundamentals"
6. Add Subject: "Machine Learning"
7. Add Goal: "Prepare for ML interviews"
8. Click "Upload & Process"
9. Watch progress: "Extracting page 45/250..."
10. ✅ Done! Start reading page 1
11. AI summary appears in right panel
12. Type notes in left panel (auto-saves)
13. Ask questions in Chat tab
```

---

## 🔮 Future Enhancements

Coming soon:
- [ ] OCR for scanned PDFs
- [ ] Multiple file upload
- [ ] Upload from URL
- [ ] Google Drive integration
- [ ] PDF preview before upload
- [ ] Edit textbook metadata later
- [ ] Batch AI processing queue

---

## 📞 Support

**Having issues?**
1. Check browser console (F12)
2. Verify `.env` has Supabase credentials
3. Check Supabase dashboard for data
4. Try uploading a small test PDF first

**Everything working?**
Start uploading your textbooks and enjoy AI-powered reading! 🎉

---

**Built with:**
- `pdfjs-dist` for text extraction
- `react-dropzone` for drag & drop
- Supabase for storage and database
- TypeScript for type safety

**Your textbooks are ready to be uploaded!** 🚀

