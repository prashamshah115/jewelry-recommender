/**
 * Fetch with automatic retry logic for connection recovery
 * Helps prevent freezing/hanging when network or session drops
 */

interface RetryOptions {
  retries?: number;
  delay?: number;
  backoff?: boolean;
}

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = true } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // If this was the last attempt, throw the error
      if (attempt === retries - 1) {
        console.error('[FetchWithRetry] All retries exhausted:', error);
        throw error;
      }

      // Calculate delay with optional exponential backoff
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      
      console.warn(
        `[FetchWithRetry] Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('fetchWithRetry: Unexpected error');
}

/**
 * Wrapper for Supabase queries with retry logic
 */
export async function supabaseWithRetry<T>(
  query: Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  return fetchWithRetry(async () => {
    const result = await query;
    
    // If there's a database error, throw it to trigger retry
    if (result.error) {
      throw result.error;
    }
    
    return result;
  }, options);
}

