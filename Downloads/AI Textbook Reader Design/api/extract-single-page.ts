// On-demand single page extraction - lightweight fallback
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
    const { textbookId, pageNumber } = req.body;

    if (!textbookId || !pageNumber) {
      return res.status(400).json({ error: 'Missing textbookId or pageNumber' });
    }

    console.log(`[Extract Single Page] Extracting page ${pageNumber} for textbook ${textbookId}`);

    // Check if page already exists
    const { data: existingPage, error: pageError } = await supabase
      .from('pages')
      .select('raw_text')
      .eq('textbook_id', textbookId)
      .eq('page_number', pageNumber)
      .single();

    if (existingPage?.raw_text) {
      console.log(`[Extract Single Page] Page ${pageNumber} already extracted`);
      return res.status(200).json({
        text: existingPage.raw_text,
        cached: true,
      });
    }

    // Get textbook PDF URL
    const { data: textbook, error: textbookError } = await supabase
      .from('textbooks')
      .select('pdf_url')
      .eq('id', textbookId)
      .single();

    if (textbookError || !textbook) {
      throw new Error('Textbook not found');
    }

    // Download PDF
    console.log(`[Extract Single Page] Downloading PDF from: ${textbook.pdf_url}`);
    const pdfResponse = await fetch(textbook.pdf_url);
    
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract single page using pdf-parse
    console.log(`[Extract Single Page] Extracting text from page ${pageNumber}`);
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer, {
      max: pageNumber, // Only parse up to the requested page for efficiency
    });

    // Split by form feed to get individual pages
    const pages = pdfData.text.split('\f');
    const pageIndex = pageNumber - 1;

    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new Error(`Page ${pageNumber} not found in PDF (total pages: ${pages.length})`);
    }

    const pageText = pages[pageIndex].trim() || `[Page ${pageNumber} - No extractable text]`;

    // Cache the extracted page
    const { error: insertError } = await supabase
      .from('pages')
      .insert({
        textbook_id: textbookId,
        page_number: pageNumber,
        raw_text: pageText,
        processed: false,
      });

    if (insertError) {
      // If insert fails due to duplicate, that's okay - it means another request already cached it
      console.log(`[Extract Single Page] Insert failed (likely duplicate):`, insertError.message);
    } else {
      console.log(`[Extract Single Page] Cached page ${pageNumber} for future use`);
    }

    return res.status(200).json({
      text: pageText,
      cached: false,
    });

  } catch (error) {
    console.error('[Extract Single Page] Error:', error);
    return res.status(500).json({
      error: 'Failed to extract page',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 10, // Single page should be fast (~2-3 seconds)
};

