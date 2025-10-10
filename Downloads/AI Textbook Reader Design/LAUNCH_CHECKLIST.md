# ✅ Launch Checklist

Use this checklist to deploy your AI Textbook Reader from zero to production.

---

## 📋 Pre-Deployment Setup

### Database Setup
- [ ] Create Supabase account at [supabase.com](https://supabase.com)
- [ ] Create new project (choose name, region, password)
- [ ] Wait for project initialization (~2 minutes)
- [ ] Navigate to SQL Editor
- [ ] Copy entire `supabase-schema.sql` file
- [ ] Paste and execute in SQL Editor
- [ ] Verify: Check "Tables" tab - should see 7 tables
- [ ] Add your email to whitelist:
  ```sql
  INSERT INTO allowed_users (email, role) VALUES ('YOUR_EMAIL', 'admin');
  ```

### API Keys
- [ ] In Supabase → Settings → API, copy:
  - [ ] Project URL
  - [ ] `anon public` key
  - [ ] `service_role` key (keep secret!)
- [ ] Get OpenAI API key from [platform.openai.com](https://platform.openai.com)
- [ ] (Optional) Set up Ollama locally for AI processing

### Environment Configuration
- [ ] Create `.env` file in project root
- [ ] Add all required variables from `.env.example`
- [ ] Double-check URLs and keys are correct
- [ ] Never commit `.env` to git!

---

## 🧪 Local Testing

### Installation
- [ ] Run `npm install`
- [ ] Check for errors in terminal
- [ ] Verify `node_modules/` created

### First Run
- [ ] Run `npm run dev`
- [ ] Open [http://localhost:5173](http://localhost:5173)
- [ ] App should load (login page)

### Authentication Test
- [ ] Click "Sign up"
- [ ] Use whitelisted email
- [ ] Create password (min 6 characters)
- [ ] Check email for confirmation link
- [ ] Click confirmation link
- [ ] Should redirect to login
- [ ] Log in with credentials

### Basic Functionality Test
- [ ] After login, should see main app interface
- [ ] Notes panel on left should be editable
- [ ] PDF reader in center (may show "No textbook loaded")
- [ ] AI panel on right with tabs
- [ ] Click user icon → can sign out

### Add Test Textbook
- [ ] Go to Supabase SQL Editor
- [ ] Get your user ID:
  ```sql
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL';
  ```
- [ ] Insert test textbook (see QUICKSTART.md for SQL)
- [ ] Refresh app
- [ ] Select textbook from header dropdown
- [ ] Should see pages load

### Features Test
- [ ] Navigate pages with j/k keys
- [ ] Type notes in left panel
- [ ] Verify "Synced" indicator appears
- [ ] Try text selection in PDF
- [ ] Check all AI panel tabs work
- [ ] Send a chat message (may not work until OpenAI configured)

---

## 🚀 Deployment to Vercel

### Git Setup
- [ ] Initialize git: `git init`
- [ ] Create `.gitignore` (should already exist)
- [ ] Verify `.env` is in `.gitignore`
- [ ] Create GitHub repository
- [ ] Add remote: `git remote add origin YOUR_REPO_URL`
- [ ] Commit: `git add . && git commit -m "Initial commit"`
- [ ] Push: `git push -u origin main`

### Vercel Setup
- [ ] Go to [vercel.com/new](https://vercel.com/new)
- [ ] Sign in with GitHub
- [ ] Click "Import Project"
- [ ] Select your repository
- [ ] Vercel should auto-detect Vite

### Environment Variables in Vercel
- [ ] Before deploying, click "Environment Variables"
- [ ] Add each variable:
  - [ ] `VITE_SUPABASE_URL` → Production
  - [ ] `VITE_SUPABASE_ANON_KEY` → Production
  - [ ] `SUPABASE_SERVICE_KEY` → Production (mark as Secret)
  - [ ] `OPENAI_API_KEY` → Production (mark as Secret)
- [ ] Double-check spelling of variable names!

### Deploy
- [ ] Click "Deploy"
- [ ] Wait for build (~2 minutes)
- [ ] Check build logs for errors
- [ ] Should see "Your project is live" ✅

### Verify Production
- [ ] Click "Visit" button
- [ ] App should load at `https://your-app.vercel.app`
- [ ] Try logging in
- [ ] Test basic functionality
- [ ] Check browser console for errors

---

## 🔧 Post-Deployment

### Domain Setup (Optional)
- [ ] In Vercel → Settings → Domains
- [ ] Add custom domain
- [ ] Update DNS records at your registrar
- [ ] Wait for SSL certificate (auto)
- [ ] Test custom domain works

### Monitoring Setup
- [ ] Check Vercel Analytics tab
- [ ] Monitor OpenAI usage at [platform.openai.com/usage](https://platform.openai.com/usage)
- [ ] Set spending limit on OpenAI if needed
- [ ] Check Supabase database usage

### Add Real Users
- [ ] For each user, run:
  ```sql
  INSERT INTO allowed_users (email, role) VALUES ('user@example.com', 'user');
  ```
- [ ] Send them the app URL
- [ ] Tell them to sign up with whitelisted email
- [ ] They'll receive confirmation email

---

## 📊 Production Readiness Checklist

### Security
- [ ] Environment variables not in code
- [ ] Service keys marked as secret in Vercel
- [ ] Row-Level Security enabled on all tables
- [ ] Only whitelisted emails can sign up
- [ ] HTTPS enabled (automatic via Vercel)

### Performance
- [ ] App loads in < 3 seconds
- [ ] Page navigation feels snappy
- [ ] Notes save without lag
- [ ] Chat responses stream smoothly

### UX
- [ ] Loading states show for async operations
- [ ] Error messages are clear
- [ ] Empty states have helpful text
- [ ] Keyboard shortcuts work

### Data
- [ ] Test textbook with pages exists
- [ ] Can create and save notes
- [ ] Notes persist across sessions
- [ ] Chat history saved to database

---

## 🐛 Troubleshooting Checklist

### If Build Fails
- [ ] Check Vercel build logs
- [ ] Look for TypeScript errors
- [ ] Verify all imports are correct
- [ ] Check `package.json` syntax
- [ ] Try building locally: `npm run build`

### If Login Doesn't Work
- [ ] Check browser console for errors
- [ ] Verify Supabase URL is correct
- [ ] Check email is in `allowed_users` table
- [ ] Try resetting password
- [ ] Check Supabase Auth logs

### If Notes Don't Save
- [ ] Check browser Network tab
- [ ] Look for 401/403 errors
- [ ] Verify RLS policies exist
- [ ] Check user has valid session
- [ ] Try logging out and back in

### If Chat Doesn't Work
- [ ] Check OpenAI API key is valid
- [ ] Verify API route deploys: `/api/chat`
- [ ] Check Vercel function logs
- [ ] Test OpenAI key with curl
- [ ] Check OpenAI usage limits

---

## 📈 Usage Monitoring

### Daily
- [ ] Check Vercel dashboard for errors
- [ ] Monitor OpenAI costs
- [ ] Check for user-reported issues

### Weekly
- [ ] Review Supabase database size
- [ ] Check Vercel bandwidth usage
- [ ] Analyze feature usage
- [ ] Backup important data

### Monthly
- [ ] Review total costs (Supabase + Vercel + OpenAI)
- [ ] Update dependencies: `npm outdated`
- [ ] Check for security updates
- [ ] Consider upgrading plans if needed

---

## 🎯 Success Criteria

You're successfully launched when:

- ✅ App accessible at public URL
- ✅ Users can sign up and log in
- ✅ Textbooks load and are navigable
- ✅ Notes save automatically
- ✅ AI features work (summaries, chat)
- ✅ No console errors
- ✅ Mobile-responsive
- ✅ Fast load times (< 3s)

---

## 📞 If You Get Stuck

1. Check browser console (F12) for errors
2. Check Vercel deployment logs
3. Check Supabase table data directly
4. Review DEPLOYMENT_GUIDE.md
5. Test API endpoints individually
6. Try in incognito mode (clear cache)

---

## 🎉 Launch Complete!

When all items are checked off, you're ready for users! 🚀

**Save this checklist** for future deployments and updates.

---

## 📝 Post-Launch Tasks

- [ ] Share app with first 3-5 beta users
- [ ] Collect feedback
- [ ] Monitor for bugs
- [ ] Iterate on AI prompts
- [ ] Add more textbooks
- [ ] Document any custom changes
- [ ] Set up regular backups
- [ ] Plan next features

**Your MVP is live. Time to iterate! 🎊**

