// Local model integration (Ollama/LM Studio)
import { UserPreferences } from './prompts';
import {
  getSummaryPrompt,
  getKeyConceptsPrompt,
  getConnectionsPrompt,
  getApplicationsPrompt,
  getPracticeQuestionsPrompt,
} from './prompts';

const LOCAL_MODEL_ENDPOINT = import.meta.env.VITE_LOCAL_MODEL_ENDPOINT || 'http://localhost:11434';
const MODEL_NAME = 'llama2'; // or 'mistral', 'mixtral', etc.

interface OllamaResponse {
  response: string;
  done: boolean;
}

async function callLocalModel(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${LOCAL_MODEL_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local model request failed: ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error('[Local Model] Error:', error);
    throw error;
  }
}

// Helper to parse JSON from model response
function extractJSON(text: string): any {
  try {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch {
    console.error('[Local Model] Failed to parse JSON from:', text);
    return null;
  }
}

export interface PageProcessingResult {
  summary: string | null;
  key_concepts: any[] | null;
  connections_to_previous: any | null;
  applications: any[] | null;
  practice_questions: any[] | null;
}

export async function processPage(
  pageText: string,
  pageNumber: number,
  subject: string,
  previousPages: Array<{ page_number: number; summary: string }>,
  userPrefs: UserPreferences
): Promise<PageProcessingResult> {
  const result: PageProcessingResult = {
    summary: null,
    key_concepts: null,
    connections_to_previous: null,
    applications: null,
    practice_questions: null,
  };

  try {
    // 1. Generate Summary
    console.log(`[Local Model] Generating summary for page ${pageNumber}...`);
    const summaryPrompt = getSummaryPrompt(
      pageText,
      pageNumber,
      subject,
      previousPages[previousPages.length - 1]?.summary || null,
      userPrefs
    );
    result.summary = await callLocalModel(summaryPrompt);

    // 2. Extract Key Concepts
    console.log(`[Local Model] Extracting key concepts...`);
    const conceptsPrompt = getKeyConceptsPrompt(pageText, userPrefs);
    const conceptsResponse = await callLocalModel(conceptsPrompt);
    result.key_concepts = extractJSON(conceptsResponse);

    // 3. Find Connections (if there are previous pages)
    if (previousPages.length > 0) {
      console.log(`[Local Model] Finding connections...`);
      const connectionsPrompt = getConnectionsPrompt(
        pageText,
        previousPages.slice(-3), // Last 3 pages
        userPrefs
      );
      const connectionsResponse = await callLocalModel(connectionsPrompt);
      result.connections_to_previous = extractJSON(connectionsResponse);
    }

    // 4. Generate Applications
    console.log(`[Local Model] Generating applications...`);
    const applicationsPrompt = getApplicationsPrompt(pageText, userPrefs);
    const applicationsResponse = await callLocalModel(applicationsPrompt);
    result.applications = extractJSON(applicationsResponse);

    // 5. Create Practice Questions
    console.log(`[Local Model] Creating practice questions...`);
    const questionsPrompt = getPracticeQuestionsPrompt(pageText, userPrefs);
    const questionsResponse = await callLocalModel(questionsPrompt);
    result.practice_questions = extractJSON(questionsResponse);

    console.log(`[Local Model] Page ${pageNumber} processing complete`);
    return result;
  } catch (error) {
    console.error('[Local Model] Processing failed:', error);
    return result;
  }
}

// Check if local model is available
export async function checkLocalModelHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${LOCAL_MODEL_ENDPOINT}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

