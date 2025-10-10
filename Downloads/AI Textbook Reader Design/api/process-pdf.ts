import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { textbookId, pdfUrl } = req.body;

  if (!textbookId || !pdfUrl) {
    return res.status(400).json({ error: 'Missing textbookId or pdfUrl' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Update status to processing
    await supabase
      .from('textbooks')
      .update({ 
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', textbookId);

    console.log(`[PDF Processing] Starting for textbook ${textbookId}`);

    // Fetch the PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    
    // Parse PDF with pdf-parse
    const pdfData = await pdf(pdfBuffer);
    
    const totalPages = pdfData.numpages;
    console.log(`[PDF Processing] Total pages: ${totalPages}`);

    // Split text by pages (approximate - pdf-parse doesn't give page-by-page text)
    // We'll use form feeds or estimate based on text length
    const fullText = pdfData.text;
    const estimatedCharsPerPage = Math.ceil(fullText.length / totalPages);
    
    const pages = [];

    // Create page chunks
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const startIdx = (pageNum - 1) * estimatedCharsPerPage;
      const endIdx = pageNum * estimatedCharsPerPage;
      const pageText = fullText.slice(startIdx, endIdx).trim();

      pages.push({
        textbook_id: textbookId,
        page_number: pageNum,
        raw_text: pageText || `[Page ${pageNum} - No text extracted]`,
        processed: false,
      });

      // Send progress update every 10 pages
      if (pageNum % 10 === 0) {
        const progress = Math.round((pageNum / totalPages) * 100);
        await supabase
          .from('textbooks')
          .update({ 
            processing_progress: progress,
            metadata: {
              last_processed_page: pageNum,
              total_pages: totalPages
            }
          })
          .eq('id', textbookId);
        
        console.log(`[PDF Processing] Progress: ${progress}% (${pageNum}/${totalPages})`);
      }
    }

    // Batch insert pages (Supabase has a limit, so batch in chunks of 100)
    const batchSize = 100;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('pages')
        .insert(batch);

      if (insertError) {
        throw insertError;
      }
      
      console.log(`[PDF Processing] Inserted pages ${i + 1} to ${Math.min(i + batchSize, pages.length)}`);
    }

    // Update status to completed
    await supabase
      .from('textbooks')
      .update({ 
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        processing_progress: 100,
        total_pages: totalPages
      })
      .eq('id', textbookId);

    console.log(`[PDF Processing] Completed for textbook ${textbookId}`);

    return res.status(200).json({ 
      success: true, 
      textbookId,
      totalPages,
      message: 'PDF processed successfully' 
    });

  } catch (error) {
    console.error('[PDF Processing] Error:', error);

    // Update status to failed
    await supabase
      .from('textbooks')
      .update({ 
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', textbookId);

    return res.status(500).json({ 
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

