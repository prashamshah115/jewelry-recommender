import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.EXTRACTION_API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing API key' 
    });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'pdf-extraction-service',
    timestamp: new Date().toISOString()
  });
});

// Main extraction endpoint
app.post('/extract', authenticateApiKey, async (req, res) => {
  const { textbookId, pdfUrl } = req.body;

  if (!textbookId || !pdfUrl) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['textbookId', 'pdfUrl']
    });
  }

  console.log(`[Extraction Service] Starting extraction for textbook ${textbookId}`);

  try {
    // Update status to processing
    await supabase
      .from('textbooks')
      .update({ 
        processing_status: 'processing',
        processing_started_at: new Date().toISOString(),
        processing_progress: 0
      })
      .eq('id', textbookId);

    // Download PDF from Supabase Storage
    console.log(`[Extraction Service] Downloading PDF from: ${pdfUrl}`);
    const pdfResponse = await fetch(pdfUrl);
    
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Extraction Service] PDF downloaded, size: ${buffer.length} bytes`);

    // Extract text from PDF
    console.log(`[Extraction Service] Extracting text...`);
    const pdfData = await pdfParse(buffer);
    
    const totalPages = pdfData.numpages;
    console.log(`[Extraction Service] Extracted ${totalPages} pages`);

    // Split text by pages (form feed character '\f' separates pages)
    const pageTexts = pdfData.text.split('\f');

    // Create page records
    const pageRecords = pageTexts.map((text, index) => ({
      textbook_id: textbookId,
      page_number: index + 1,
      raw_text: text.trim() || `[Page ${index + 1} - No extractable text]`,
      processed: false,
    }));

    // Insert pages in batches
    const batchSize = 100;
    let processedCount = 0;

    for (let i = 0; i < pageRecords.length; i += batchSize) {
      const batch = pageRecords.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('pages')
        .insert(batch);

      if (insertError) {
        console.error(`[Extraction Service] Insert error:`, insertError);
        throw insertError;
      }

      processedCount += batch.length;
      const progress = Math.round((processedCount / totalPages) * 100);

      // Update progress
      await supabase
        .from('textbooks')
        .update({ 
          processing_progress: progress,
          metadata: {
            last_processed_page: processedCount,
            total_pages: totalPages
          }
        })
        .eq('id', textbookId);

      console.log(`[Extraction Service] Progress: ${progress}% (${processedCount}/${totalPages})`);
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

    console.log(`[Extraction Service] Completed extraction for textbook ${textbookId}`);

    res.json({ 
      success: true,
      textbookId,
      totalPages,
      message: 'PDF extraction completed successfully'
    });

  } catch (error) {
    console.error('[Extraction Service] Error:', error);

    // Update status to failed
    await supabase
      .from('textbooks')
      .update({ 
        processing_status: 'failed',
        processing_error: error.message || 'Unknown error'
      })
      .eq('id', textbookId);

    res.status(500).json({ 
      error: 'Extraction failed',
      details: error.message || 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PDF Extraction Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

