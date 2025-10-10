# 🚀 Deployment Guide - AI Textbook Reader

Complete step-by-step guide to deploy your AI Textbook Reader to production.

---

## 📋 Prerequisites

- [Supabase Account](https://supabase.com) (Free tier works)
- [Vercel Account](https://vercel.com) (Free tier works)
- [OpenAI API Key](https://platform.openai.com) (for chat feature)
- Local Ollama/LM Studio (optional, for local AI processing)
- Node.js 18+ installed locally

---

## 🗄️ Step 1: Set Up Supabase Database

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization, name your project (e.g., "ai-textbook-reader")
4. Create a strong database password (save this!)
5. Select region closest to your users
6. Wait for project to finish setting up (~2 minutes)

### 1.2 Run Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL editor
5. Click "Run" or press Cmd/Ctrl + Enter
6. You should see "Success. No rows returned"

### 1.3 Add Yourself to Whitelist
In the SQL Editor, run:
```sql
INSERT INTO allowed_users (email, role) 
VALUES ('your-email@example.com', 'admin');
```
Replace with your actual email address!

### 1.4 Get Your API Keys
1. Go to **Project Settings** → **API**
2. Copy the following:
   - `Project URL` (looks like: `https://xxxxx.supabase.co`)
   - `anon public` key (starts with `eyJ...`)
   - `service_role` key (starts with `eyJ...`, keep this SECRET!)

---

## 🔧 Step 2: Configure Environment Variables

### 2.1 Create Local .env File
Create a file named `.env` in the project root:

```bash
# Supabase (from Step 1.4)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# OpenAI (get from platform.openai.com)
OPENAI_API_KEY=sk-your-openai-key-here

# Supabase Service Key (for server-side operations)
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Local Model (optional - if using Ollama)
VITE_LOCAL_MODEL_ENDPOINT=http://localhost:11434
```

### 2.2 Test Locally
```bash
npm install
npm run dev
```

Open `http://localhost:5173` and try:
1. Creating an account with your whitelisted email
2. Logging in
3. The app should load (though no textbooks yet)

---

## ☁️ Step 3: Deploy to Vercel

### 3.1 Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### 3.2 Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel auto-detects Vite configuration

3. **Add Environment Variables**
   Before deploying, click "Environment Variables" and add:
   
   | Name | Value | Secret |
   |------|-------|--------|
   | `VITE_SUPABASE_URL` | Your Supabase URL | No |
   | `VITE_SUPABASE_ANON_KEY` | Your anon key | No |
   | `SUPABASE_SERVICE_KEY` | Your service role key | **Yes** |
   | `OPENAI_API_KEY` | Your OpenAI key | **Yes** |
   | `VITE_LOCAL_MODEL_ENDPOINT` | (optional) | No |

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live! 🎉

### 3.3 Deploy via CLI

```bash
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: ai-textbook-reader
# - Directory: ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add OPENAI_API_KEY

# Deploy to production
vercel --prod
```

---

## 🤖 Step 4: Set Up AI Processing

### Option A: Local Model (Ollama)

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl https://ollama.ai/install.sh | sh
   ```

2. **Pull a Model**
   ```bash
   ollama pull llama2
   # or
   ollama pull mistral
   ```

3. **Run Ollama**
   ```bash
   ollama serve
   ```

4. **Test Processing**
   - Upload a textbook PDF
   - Pages will be processed automatically
   - Check Supabase tables for AI content

### Option B: Cloud Model (Future)
Coming soon: Direct integration with OpenAI for page processing.

---

## 📚 Step 5: Add Your First Textbook

### 5.1 Upload PDF to Supabase Storage

1. In Supabase dashboard, go to **Storage**
2. Create bucket: `textbook-pdfs` (if not exists)
3. Upload your PDF
4. Copy the public URL

### 5.2 Add Textbook to Database

In Supabase SQL Editor:

```sql
-- Get your user ID first
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Insert textbook (replace USER_ID and PDF_URL)
INSERT INTO textbooks (user_id, title, pdf_url, total_pages, metadata)
VALUES (
  'YOUR_USER_ID',
  'Deep Learning Fundamentals',
  'YOUR_PDF_URL',
  250,
  '{"subject": "AI/ML", "author": "Your Name"}'::jsonb
);

-- Get textbook ID
SELECT id FROM textbooks WHERE title = 'Deep Learning Fundamentals';

-- Add sample pages (replace TEXTBOOK_ID)
INSERT INTO pages (textbook_id, page_number, raw_text)
VALUES 
  ('TEXTBOOK_ID', 1, 'Chapter 1: Introduction to Neural Networks...\n\nNeural networks are...'),
  ('TEXTBOOK_ID', 2, 'Chapter 1 continued...');
```

### 5.3 Verify in App

1. Refresh your deployed app
2. Select textbook from dropdown
3. Navigate pages
4. Take notes (auto-saved!)
5. Try chat feature

---

## 🔐 Step 6: Add More Users (Whitelist)

To allow others to use your app:

```sql
INSERT INTO allowed_users (email, role) 
VALUES ('friend@example.com', 'user');
```

They can then:
1. Visit your app URL
2. Click "Sign up"
3. Use their whitelisted email
4. Confirm email
5. Start using the app!

---

## 🛠️ Step 7: Optional Enhancements

### 7.1 Custom Domain

1. In Vercel dashboard → Settings → Domains
2. Add your domain (e.g., `textbook.yourdomain.com`)
3. Update DNS records as instructed
4. SSL auto-configured ✅

### 7.2 PDF Text Extraction Script

Create `scripts/extract-pdf.js`:

```javascript
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

// Extract text from PDF and populate pages table
// Run: node scripts/extract-pdf.js path/to/textbook.pdf
```

### 7.3 Analytics

Add Vercel Analytics:
```bash
npm install @vercel/analytics
```

In `main.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

// Add <Analytics /> to your render
```

---

## 🐛 Troubleshooting

### "No textbooks yet" after login
- Check Supabase SQL: `SELECT * FROM textbooks WHERE user_id = auth.uid();`
- Verify RLS policies are applied
- Check browser console for errors

### Notes not saving
- Open browser dev tools → Network tab
- Save a note
- Look for 401/403 errors
- Verify `VITE_SUPABASE_ANON_KEY` is correct

### Chat not working
- Check API route: `https://your-app.vercel.app/api/chat`
- Verify `OPENAI_API_KEY` is set in Vercel
- Check Vercel logs: Dashboard → Deployments → Logs

### Local model not connecting
- Ensure Ollama is running: `curl http://localhost:11434/api/tags`
- Check endpoint in `.env`
- Try different model: `ollama pull mistral`

---

## 📊 Monitoring Costs

### Supabase (Free Tier Limits)
- ✅ 500 MB database
- ✅ 1 GB storage
- ✅ 2 GB bandwidth
- Upgrade at $25/month if needed

### Vercel (Free Tier Limits)
- ✅ 100 GB bandwidth
- ✅ 100 builds/month
- ✅ Serverless function executions
- Upgrade at $20/month Pro if needed

### OpenAI API
- Chat: ~$0.01-0.05 per conversation
- Monitor at platform.openai.com/usage
- Set spending limits in OpenAI dashboard

---

## 🎉 You're Live!

Your AI Textbook Reader is now production-ready!

**Next Steps:**
1. Add more textbooks
2. Invite friends to whitelist
3. Fine-tune AI prompts in `src/lib/ai/prompts.ts`
4. Customize UI in component files
5. Monitor usage and costs

**Need Help?**
- Check browser console for errors
- Review Vercel function logs
- Query Supabase tables directly
- Test API endpoints with curl/Postman

---

## 📝 Useful Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
vercel --prod

# Check Supabase connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/

# Test OpenAI API
curl https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_KEY"

# Pull latest from git and redeploy
git pull && vercel --prod
```

---

**Congratulations! 🚀 Your MVP is live and ready for real users.**

