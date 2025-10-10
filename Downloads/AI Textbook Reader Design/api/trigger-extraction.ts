// API endpoint to trigger Railway extraction service
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { textbookId, pdfUrl } = req.body;

  if (!textbookId || !pdfUrl) {
    return res.status(400).json({ error: 'Missing textbookId or pdfUrl' });
  }

  const railwayUrl = process.env.RAILWAY_EXTRACT_URL;
  const apiKey = process.env.EXTRACTION_API_KEY;

  if (!railwayUrl || !apiKey) {
    console.error('[Trigger Extraction] Railway URL or API key not configured');
    return res.status(500).json({ 
      error: 'Extraction service not configured',
      details: 'RAILWAY_EXTRACT_URL or EXTRACTION_API_KEY environment variable missing'
    });
  }

  try {
    console.log(`[Trigger Extraction] Sending request to Railway for textbook ${textbookId}`);
    
    // Call Railway extraction service
    const response = await fetch(railwayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        textbookId,
        pdfUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Trigger Extraction] Railway returned error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'Railway extraction service error',
        details: errorData.error || errorData.details || 'Unknown error',
      });
    }

    const data = await response.json();
    console.log(`[Trigger Extraction] Railway accepted request for textbook ${textbookId}`);

    return res.status(200).json({
      success: true,
      message: 'Extraction started on Railway',
      data,
    });
  } catch (error) {
    console.error('[Trigger Extraction] Error:', error);
    return res.status(500).json({
      error: 'Failed to trigger extraction',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 10, // Just triggering, not actually extracting
};

