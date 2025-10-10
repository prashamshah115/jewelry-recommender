# ⚡ Quick Start - Get Running in 10 Minutes

This is the fastest path to get your AI Textbook Reader running locally and deployed.

---

## 🏃‍♂️ Local Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase
1. Go to [supabase.com](https://supabase.com/dashboard)
2. Click "New Project"
3. Name it, choose region, create password
4. Wait 2 minutes for setup

### 3. Create Database
1. In Supabase, go to **SQL Editor**
2. Copy ALL content from `supabase-schema.sql`
3. Paste and click **Run**

### 4. Add Your Email to Whitelist
In SQL Editor:
```sql
INSERT INTO allowed_users (email, role) 
VALUES ('YOUR-EMAIL@gmail.com', 'admin');
```

### 5. Get API Keys
In Supabase → **Settings** → **API**, copy:
- Project URL
- `anon public` key
- `service_role` key

### 6. Create .env File
Create a file named `.env` in project root:
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
OPENAI_API_KEY=sk-... (get from platform.openai.com)
```

### 7. Run!
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign up with your email!

---

## 🚀 Deploy to Production (5 minutes)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Add these environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` (mark as secret)
   - `OPENAI_API_KEY` (mark as secret)
4. Click **Deploy**
5. Wait 2 minutes
6. Done! ✅

Your app is now live at `https://your-app.vercel.app`

---

## 📚 Add a Test Textbook

### Quick Method (Testing)
In Supabase SQL Editor:

```sql
-- 1. Get your user ID
SELECT id, email FROM auth.users;

-- 2. Insert a test textbook (replace YOUR_USER_ID)
INSERT INTO textbooks (user_id, title, total_pages)
VALUES ('YOUR_USER_ID', 'My First Textbook', 5)
RETURNING id;

-- 3. Add test pages (replace TEXTBOOK_ID from above)
INSERT INTO pages (textbook_id, page_number, raw_text) VALUES
('TEXTBOOK_ID', 1, 'Chapter 1: Introduction

This is the introduction to our textbook. Neural networks are computational models inspired by the human brain...'),
('TEXTBOOK_ID', 2, 'Chapter 1 continued...

Deep learning involves training neural networks with many layers...'),
('TEXTBOOK_ID', 3, 'Chapter 2: Backpropagation

Backpropagation is the algorithm used to train neural networks...');

-- 4. Add sample AI content (replace PAGE_ID)
INSERT INTO ai_processed_content (page_id, summary, key_concepts)
SELECT 
  id, 
  'This page introduces neural networks and their basic structure.',
  '[{"name": "Neural Networks", "explanation": "Computational models inspired by the brain"}]'::jsonb
FROM pages 
WHERE textbook_id = 'TEXTBOOK_ID' AND page_number = 1;
```

### Full Method (Production)
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) Step 5 for PDF upload instructions.

---

## ✅ Verify Everything Works

1. **Login** - Sign up with whitelisted email
2. **Select Textbook** - Choose from dropdown
3. **Navigate Pages** - Use j/k keys or arrows
4. **Take Notes** - Type in left panel (auto-saves)
5. **View AI Summary** - Right panel → Summary tab
6. **Chat** - Ask a question in Chat tab

---

## 🐛 Common Issues

**Can't login?**
```sql
-- Check if you're whitelisted:
SELECT * FROM allowed_users WHERE email = 'your@email.com';
```

**No textbooks showing?**
```sql
-- Check textbooks:
SELECT * FROM textbooks;
-- Make sure user_id matches your auth.users.id
```

**Notes not saving?**
- Open browser console (F12)
- Check for red errors
- Verify VITE_SUPABASE_ANON_KEY is correct in .env

---

## 🎉 Next Steps

- Read full [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Set up local AI model (Ollama)
- Customize AI prompts in `src/lib/ai/prompts.ts`
- Add more users to whitelist
- Upload real PDFs

---

**Questions?** Check README.md or DEPLOYMENT_GUIDE.md

