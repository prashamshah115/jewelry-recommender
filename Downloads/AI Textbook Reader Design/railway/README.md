# PDF Extraction Service (Railway)

Heavy-duty PDF text extraction service designed to run on Railway.app to avoid Vercel timeout limitations.

## 🎯 Purpose

This service handles the time-intensive task of extracting text from large PDFs (100+ pages), which would timeout on Vercel's 10-second free tier limit.

## 🏗️ Architecture

```
Vercel Upload → Supabase Storage → Railway Extraction → Supabase Database
```

## 🚀 Deployment to Railway

### 1. Install Railway CLI (optional)
```bash
npm install -g @railway/cli
railway login
```

### 2. Deploy via Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select this repository
4. Set root directory to `/railway`
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `EXTRACTION_API_KEY` (generate a secure random string)
   - `PORT` (Railway sets this automatically, but you can override)

### 3. Get Your Railway URL

After deployment, Railway will provide a URL like:
```
https://your-service.railway.app
```

### 4. Update Vercel Environment Variables

Add these to your Vercel project:
```bash
RAILWAY_EXTRACT_URL=https://your-service.railway.app/extract
EXTRACTION_API_KEY=your-same-secure-key
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "pdf-extraction-service",
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

### Extract PDF
```bash
POST /extract
Headers:
  x-api-key: your-extraction-api-key
  Content-Type: application/json

Body:
{
  "textbookId": "uuid-here",
  "pdfUrl": "https://supabase-storage-url.com/file.pdf"
}
```

Response:
```json
{
  "success": true,
  "textbookId": "uuid-here",
  "totalPages": 245,
  "message": "PDF extraction completed successfully"
}
```

## 🧪 Local Development

```bash
cd railway
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Test the endpoint:
```bash
curl -X POST http://localhost:3000/extract \
  -H "x-api-key: your-test-key" \
  -H "Content-Type: application/json" \
  -d '{"textbookId":"test-id","pdfUrl":"https://example.com/test.pdf"}'
```

## 🔒 Security

- API key authentication on all extraction endpoints
- CORS enabled for Vercel origin only (configure in production)
- Supabase RLS policies ensure data isolation

## 📊 Performance

- **No timeout limits** (unlike Vercel's 10s)
- Handles PDFs up to 500+ pages
- Processes ~10-20 pages per second
- Progress updates every 100 pages

## 💰 Cost Estimate

Railway free tier includes:
- $5 free credit per month
- Runs when needed (not 24/7 required)
- Sufficient for MVP/testing

For production:
- Railway Pro: ~$5-10/month
- Scales automatically based on usage

## 🐛 Troubleshooting

### Issue: "Unauthorized" error
- Check that `EXTRACTION_API_KEY` matches between Railway and Vercel

### Issue: Extraction fails
- Check Railway logs: `railway logs`
- Verify Supabase credentials
- Ensure PDF URL is publicly accessible

### Issue: Slow extraction
- Railway free tier may have resource limits
- Consider upgrading to Railway Pro for faster CPU

## 📝 Notes

- This service is stateless and can be restarted anytime
- Progress is saved to Supabase, so interruptions are recoverable
- Multiple extractions can run in parallel

