// Vercel Edge Function for SERVER-SIDE PDF Text Extraction
// This is MUCH faster than client-side processing
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { textbookId, filePath } = req.body;

    console.log('[Extract PDF] Starting for textbook:', textbookId);

    // Download PDF from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('textbook-pdfs')
      .download(filePath);

    if (downloadError) throw downloadError;

    // Convert to buffer for pdf-parse
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[Extract PDF] PDF downloaded, size:', buffer.length, 'bytes');

    // Dynamic import of pdf-parse (works in Node.js edge functions)
    const pdfParse = (await import('pdf-parse')).default;
    
    // Extract text - THIS IS FAST ON SERVER
    console.log('[Extract PDF] Starting text extraction...');
    const pdfData = await pdfParse(buffer);
    
    console.log('[Extract PDF] Extraction complete:', pdfData.numpages, 'pages');

    // Split into pages (form feed character '\f' separates pages in pdf-parse)
    const pageTexts = pdfData.text.split('\f');

    // Batch insert pages (much faster than one-by-one)
    const pageRecords = pageTexts.map((text, index) => ({
      textbook_id: textbookId,
      page_number: index + 1,
      raw_text: text.trim(),
      processed: false,
    }));

    // Insert in batches of 100 (Supabase limit)
    const batchSize = 100;
    for (let i = 0; i < pageRecords.length; i += batchSize) {
      const batch = pageRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('pages')
        .insert(batch);

      if (insertError) {
        console.error('[Extract PDF] Insert error:', insertError);
        throw insertError;
      }

      console.log(`[Extract PDF] Inserted pages ${i + 1}-${Math.min(i + batchSize, pageRecords.length)}`);
    }

    // Update textbook with total pages
    const { error: updateError } = await supabase
      .from('textbooks')
      .update({
        total_pages: pageTexts.length,
        processing_status: 'completed',
        processing_progress: 100,
      })
      .eq('id', textbookId);

    if (updateError) throw updateError;

    console.log('[Extract PDF] Complete! Processed', pageTexts.length, 'pages');

    return res.status(200).json({
      success: true,
      pages: pageTexts.length,
      message: 'Text extraction completed',
    });

  } catch (error) {
    console.error('[Extract PDF] Error:', error);

    // Mark as failed
    if (req.body.textbookId) {
      await supabase
        .from('textbooks')
        .update({
          processing_status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', req.body.textbookId);
    }

    return res.status(500).json({
      error: 'Failed to extract PDF text',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Run on Node.js runtime (not Edge) for pdf-parse compatibility
export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // 5 minutes for large PDFs
};

