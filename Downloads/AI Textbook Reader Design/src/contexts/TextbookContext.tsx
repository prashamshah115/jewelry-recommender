import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import type { UploadMetadata } from '../components/UploadDialog';
import { fetchWithRetry } from '../lib/fetchWithRetry';

interface Page {
  id: string;
  page_number: number;
  raw_text: string;
  processed: boolean;
}

interface AIContent {
  summary: string | null;
  key_concepts: any[] | null;
  connections_to_previous: any | null;
  applications: any[] | null;
  practice_questions: any[] | null;
}

interface Textbook {
  id: string;
  title: string;
  total_pages: number;
  pdf_url: string | null;
  created_at: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_progress: number;
  processing_error: string | null;
  ai_processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  ai_processing_progress: number;
  ai_processing_error: string | null;
}

interface TextbookContextType {
  currentTextbook: Textbook | null;
  textbooks: Textbook[];
  currentPage: number;
  actualPageCount: number | null;
  currentPageData: Page | null;
  currentAIContent: AIContent | null;
  loading: boolean;
  setCurrentPage: (page: number) => void;
  setActualPageCount: (count: number) => void;
  loadTextbook: (textbookId: string) => Promise<void>;
  loadTextbooks: () => Promise<void>;
  uploadTextbook: (file: File, metadata: UploadMetadata, onProgress?: (progress: number, stage: string) => void) => Promise<string>;
  nextPage: () => void;
  prevPage: () => void;
}

const TextbookContext = createContext<TextbookContextType | undefined>(undefined);

export function TextbookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTextbook, setCurrentTextbook] = useState<Textbook | null>(null);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [actualPageCount, setActualPageCount] = useState<number | null>(null);
  const [currentPageData, setCurrentPageData] = useState<Page | null>(null);
  const [currentAIContent, setCurrentAIContent] = useState<AIContent | null>(null);
  const [loading, setLoading] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Ensure we have a valid session before making queries
  const ensureValidSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.warn('[Session] No valid session found');
        return false;
      }
      
      // Check if token is about to expire (within 60 seconds)
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 - Date.now() < 60000) {
        console.log('[Session] Token expiring soon, refreshing...');
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !newSession) {
          console.error('[Session] Failed to refresh:', refreshError);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('[Session] Error checking session:', error);
      return false;
    }
  };

  // Load user's textbooks
  const loadTextbooks = async () => {
    if (!user) return;

    try {
      // Ensure valid session
      const hasValidSession = await ensureValidSession();
      if (!hasValidSession) {
        toast.error('Session expired. Please refresh the page.');
        return;
      }

      const { data, error } = await supabase
        .from('textbooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTextbooks(data || []);
    } catch (error) {
      console.error('[Textbook] Failed to load textbooks:', error);
      toast.error('Failed to load textbooks');
    }
  };

  // Load a specific textbook
  const loadTextbook = async (textbookId: string, retryCount = 0) => {
    try {
      setLoading(true);
      
      // Ensure valid session
      const hasValidSession = await ensureValidSession();
      if (!hasValidSession) {
        toast.error('Session expired. Please refresh the page.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('textbooks')
        .select('*')
        .eq('id', textbookId)
        .single();

      if (error) {
        // Check if it's a 406 or auth error and retry once
        if (retryCount === 0 && (error.code === '406' || error.message?.includes('JWT'))) {
          console.log('[Textbook] Auth error detected, refreshing session and retrying...');
          await supabase.auth.refreshSession();
          return loadTextbook(textbookId, 1);
        }
        throw error;
      }
      
      setCurrentTextbook(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('[Textbook] Failed to load textbook:', error);
      setCurrentTextbook(null);
      toast.error('Failed to load textbook');
    } finally {
      setLoading(false);
    }
  };

  // Load page data and AI content with retry logic
  const loadPageData = async (retryCount = 0) => {
    if (!currentTextbook) return;

    try {
      setLoading(true);

      // FIX #1: Ensure valid session before querying
      const hasValidSession = await ensureValidSession();
      if (!hasValidSession) {
        // Session is truly gone, can't proceed
        toast.error('Session expired. Please refresh the page.');
        setCurrentPageData(null);
        setCurrentAIContent(null);
        setLoading(false);
        return;
      }

      // Get page data
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('textbook_id', currentTextbook.id)
        .eq('page_number', currentPage)
        .single();

      if (pageError) {
        // FIX #2: Retry logic for 406 errors (session timeout)
        if (retryCount === 0 && (pageError.code === '406' || pageError.message?.includes('JWT'))) {
          console.log('[PageData] Auth error detected, refreshing session and retrying...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            return loadPageData(1); // Retry once with fresh token
          }
        }
        throw pageError;
      }
      
      setCurrentPageData(pageData);

      // Get AI content for this page
      if (pageData) {
        const { data: aiData, error: aiError } = await supabase
          .from('ai_processed_content')
          .select('*')
          .eq('page_id', pageData.id)
          .single();

        if (aiError && aiError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is ok
          console.error('[Textbook] Failed to load AI content:', aiError);
        }

        setCurrentAIContent(aiData || null);
      }
    } catch (error: any) {
      // FIX #3: Better error handling - always clear stale data
      console.error('[Textbook] Failed to load page data:', error);
      setCurrentPageData(null);
      setCurrentAIContent(null);
      
      // Provide helpful error message
      if (error.code === '406' || error.message?.includes('JWT')) {
        toast.error('Session expired. Please refresh the page.');
      } else {
        toast.error('Failed to load page. Please try again.');
      }
    } finally {
      // FIX #3: Always clear loading state
      setLoading(false);
    }
  };

  // Poll for textbook processing status
  const pollTextbookStatus = (textbookId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('textbooks')
        .select('processing_status, processing_progress, processing_error')
        .eq('id', textbookId)
        .single();

      if (error) {
        console.error('[Polling] Error:', error);
        return;
      }

      if (data.processing_status === 'completed') {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        
        // Trigger AI processing
        console.log('[Polling] PDF processing complete, triggering AI processing');
        triggerAIProcessing(textbookId);
        
        toast.success('Text extracted! Now generating AI summaries...');
        await loadTextbooks();
        
        // Start polling for AI status
        pollAIStatus(textbookId);
      } else if (data.processing_status === 'failed') {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        toast.error(`Processing failed: ${data.processing_error || 'Unknown error'}`);
        await loadTextbooks();
      } else if (data.processing_status === 'processing') {
        // Update the textbook in state to show progress
        setTextbooks(prev => prev.map(tb => 
          tb.id === textbookId 
            ? { ...tb, processing_progress: data.processing_progress || 0 }
            : tb
        ));
      }
    }, 3000); // Poll every 3 seconds
  };

  // Poll for AI processing status
  const pollAIStatus = (textbookId: string) => {
    const aiPollingInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from('textbooks')
        .select('ai_processing_status, ai_processing_progress, ai_processing_error')
        .eq('id', textbookId)
        .single();

      if (error) {
        console.error('[AI Polling] Error:', error);
        return;
      }

      if (data.ai_processing_status === 'completed') {
        clearInterval(aiPollingInterval);
        toast.success('Your textbook is ready to read!', { duration: 3000 });
        await loadTextbooks();
        await loadTextbook(textbookId);
      } else if (data.ai_processing_status === 'failed') {
        clearInterval(aiPollingInterval);
        toast.error(`AI processing failed: ${data.ai_processing_error || 'Unknown error'}`);
        await loadTextbooks();
      } else if (data.ai_processing_status === 'processing') {
        // Update progress
        setTextbooks(prev => prev.map(tb => 
          tb.id === textbookId 
            ? { ...tb, ai_processing_progress: data.ai_processing_progress || 0 }
            : tb
        ));
      }
    }, 3000);
  };

  // Trigger AI processing
  const triggerAIProcessing = async (textbookId: string) => {
    try {
      const response = await fetch('/api/process-pdf-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textbookId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start AI processing');
      }

      console.log('[AI Processing] Started successfully');
    } catch (error) {
      console.error('[AI Processing] Failed to trigger:', error);
      toast.error('Failed to start AI processing');
    }
  };

  // Background processing function - Triggers Railway extraction service
  const processTextbookInBackground = async (textbookId: string, filePath: string) => {
    try {
      console.log('[Background] Triggering Railway extraction for:', textbookId);
      
      // Get PDF URL from Supabase Storage
      const { data: urlData } = supabase.storage
        .from('textbook-pdfs')
        .getPublicUrl(filePath);
      
      const pdfUrl = urlData.publicUrl;
      
      // Trigger Railway extraction (fire-and-forget)
      // Note: This is async but we don't wait for completion
      fetch('/api/trigger-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          textbookId,
          pdfUrl 
        }),
      }).then(async (response) => {
        if (response.ok) {
          console.log('[Background] Railway extraction triggered successfully');
          toast.info('Text extraction started in background. You can start reading now!', { duration: 5000 });
          
          // Start polling for extraction completion
          startExtractionPolling(textbookId);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[Background] Failed to trigger extraction:', errorData);
          toast.warning('Background extraction failed to start. AI features will use on-demand extraction.', { duration: 5000 });
        }
      }).catch(error => {
        console.error('[Background] Error triggering extraction:', error);
        toast.warning('Background extraction unavailable. AI features will work on-demand.', { duration: 5000 });
      });

    } catch (error) {
      console.error('[Background] Processing setup failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.warning(`Could not start background processing: ${errorMessage}. You can still use the PDF.`, { duration: 5000 });
    }
  };

  // Poll for extraction completion
  const startExtractionPolling = (textbookId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: textbook } = await supabase
          .from('textbooks')
          .select('processing_status, processing_progress, total_pages')
          .eq('id', textbookId)
          .single();

        if (textbook?.processing_status === 'completed') {
          clearInterval(pollInterval);
          toast.success(`Text extraction complete! ${textbook.total_pages} pages ready for AI features.`);
          
          // Trigger chapter detection and AI processing
          try {
            const chapterResponse = await fetch('/api/detect-chapters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ textbookId }),
            });
            
            if (chapterResponse.ok) {
              const { count } = await chapterResponse.json();
              console.log(`[Background] Detected ${count} chapters`);
              toast.success(`Detected ${count} chapters!`);
            }
          } catch (error) {
            console.error('[Background] Chapter detection failed:', error);
          }
          
          await loadTextbooks();
        } else if (textbook?.processing_status === 'failed') {
          clearInterval(pollInterval);
          toast.error('Text extraction failed. AI features will use on-demand extraction.');
          await loadTextbooks();
        }
      } catch (error) {
        console.error('[Background] Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Clean up after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  // Upload textbook (Instant view + background processing)
  const uploadTextbook = async (
    file: File,
    metadata: UploadMetadata,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Generate textbook ID
      const textbookId = crypto.randomUUID();

      // Step 1: Upload PDF to Supabase Storage
      onProgress?.(30, 'uploading');
      const filePath = `${user.id}/${textbookId}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('textbook-pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('textbook-pdfs')
        .getPublicUrl(filePath);

      const pdfUrl = urlData.publicUrl;

      // Step 2: Create textbook record (minimal info for instant viewing)
      onProgress?.(60, 'saving');
      const { error: textbookError } = await supabase
        .from('textbooks')
        .insert({
          id: textbookId,
          user_id: user.id,
          title: metadata.title,
          pdf_url: pdfUrl,
          total_pages: 1, // Placeholder, will be updated after extraction
          processing_status: 'pending',
          processing_progress: 0,
          ai_processing_status: 'pending',
          ai_processing_progress: 0,
          metadata: {
            subject: metadata.subject,
            learning_goal: metadata.learningGoal,
            original_filename: file.name,
          },
        });

      if (textbookError) throw textbookError;

      // Step 3: Load textbook immediately so user can view it
      onProgress?.(90, 'done');
      await loadTextbooks();
      await loadTextbook(textbookId);
      
      onProgress?.(100, 'done');
      toast.success('PDF uploaded! You can read it now. Processing text in background...', { duration: 5000 });

      // Step 4: Start background processing (non-blocking, SERVER-SIDE)
      processTextbookInBackground(textbookId, filePath);

      return textbookId;
    } catch (error) {
      console.error('[Textbook Upload] Error:', error);
      toast.error('Failed to upload textbook');
      throw error;
    }
  };

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Navigation helpers
  const nextPage = () => {
    const maxPages = actualPageCount || currentTextbook?.total_pages || 1;
    if (currentPage < maxPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Load page data when page changes
  useEffect(() => {
    if (currentTextbook) {
      loadPageData();
    }
  }, [currentPage, currentTextbook]);

  // Load textbooks on mount
  useEffect(() => {
    if (user) {
      loadTextbooks();
    }
  }, [user]);

  return (
    <TextbookContext.Provider
      value={{
        currentTextbook,
        textbooks,
        currentPage,
        actualPageCount,
        currentPageData,
        currentAIContent,
        loading,
        setCurrentPage,
        setActualPageCount,
        loadTextbook,
        loadTextbooks,
        uploadTextbook,
        nextPage,
        prevPage,
      }}
    >
      {children}
    </TextbookContext.Provider>
  );
}

export function useTextbook() {
  const context = useContext(TextbookContext);
  if (context === undefined) {
    throw new Error('useTextbook must be used within a TextbookProvider');
  }
  return context;
}

