// PDF text extraction utility using pdf.js
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker (use local worker from node_modules)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  totalPages: number;
}

/**
 * Extract text from all pages of a PDF file
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<{ pages: ExtractedPage[]; metadata: PDFMetadata }> {
  try {
    // Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Get metadata
    const metadata = await pdf.getMetadata();
    const pdfMetadata: PDFMetadata = {
      title: metadata.info?.Title || file.name.replace('.pdf', ''),
      author: metadata.info?.Author,
      subject: metadata.info?.Subject,
      totalPages: pdf.numPages,
    };

    // Extract text from each page
    const pages: ExtractedPage[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Combine all text items with spaces
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();

      pages.push({
        pageNumber: i,
        text: pageText || `[Page ${i} - No text extracted]`,
      });

      // Report progress
      if (onProgress) {
        onProgress({
          currentPage: i,
          totalPages: pdf.numPages,
          percentage: (i / pdf.numPages) * 100,
        });
      }
    }

    return { pages, metadata: pdfMetadata };
  } catch (error) {
    console.error('[PDF Extractor] Error:', error);
    throw new Error('Failed to extract text from PDF. Make sure it\'s a valid PDF file.');
  }
}

/**
 * Validate PDF file
 */
export function validatePDF(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_PAGES = 1000;

  if (!file.type || file.type !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF' };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'PDF must be smaller than 50MB' };
  }

  return { valid: true };
}

/**
 * Estimate reading time based on page count
 */
export function estimateReadingTime(pageCount: number): string {
  const minutesPerPage = 5; // Average
  const totalMinutes = pageCount * minutesPerPage;
  
  if (totalMinutes < 60) {
    return `${totalMinutes} minutes`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

