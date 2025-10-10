// System prompts for local model processing

export interface UserPreferences {
  learning_goals?: string;
  target_level?: 'beginner' | 'intermediate' | 'advanced';
  preferred_summary_style?: 'concise' | 'detailed' | 'bullet-points';
  ai_personality?: string;
}

export function getSummaryPrompt(
  pageText: string,
  pageNumber: number,
  subject: string,
  previousSummary: string | null,
  userPrefs: UserPreferences
) {
  const levelContext = {
    beginner: 'Explain concepts in simple terms, define technical vocabulary, and provide analogies.',
    intermediate: 'Balance technical accuracy with accessibility, assume basic background knowledge.',
    advanced: 'Use precise technical language, focus on nuances and advanced implications.',
  };

  return `You are analyzing page ${pageNumber} of a ${subject} textbook.

User Context:
- Learning Goal: ${userPrefs.learning_goals || 'General understanding'}
- Experience Level: ${userPrefs.target_level || 'intermediate'}
- Style Preference: ${userPrefs.preferred_summary_style || 'concise'}

${previousSummary ? `Previous Page Summary:\n${previousSummary}\n` : ''}

Current Page Content:
${pageText}

Task: Generate a ${userPrefs.preferred_summary_style || 'concise'} summary that:
1. Captures the main ideas and key concepts
2. ${previousSummary ? 'Connects to the previous page content' : 'Sets the foundation for understanding'}
3. Highlights what matters most for: ${userPrefs.learning_goals || 'learning this topic'}
4. ${levelContext[userPrefs.target_level || 'intermediate']}

Summary:`;
}

export function getKeyConceptsPrompt(pageText: string, userPrefs: UserPreferences) {
  return `Extract 3-5 key concepts from this textbook page.

User Level: ${userPrefs.target_level || 'intermediate'}

Page Content:
${pageText}

For each concept, provide:
1. Concept name (2-4 words)
2. Brief explanation (1-2 sentences)
3. Why it matters for: ${userPrefs.learning_goals || 'understanding the topic'}

Format as JSON array:
[
  {
    "name": "Concept Name",
    "explanation": "Brief explanation",
    "importance": "Why it matters"
  }
]

JSON:`;
}

export function getConnectionsPrompt(
  currentPageText: string,
  previousPages: Array<{ page_number: number; summary: string }>,
  userPrefs: UserPreferences
) {
  const previousContext = previousPages
    .map((p) => `Page ${p.page_number}: ${p.summary}`)
    .join('\n\n');

  return `Identify conceptual connections between the current page and previous content.

Previous Content:
${previousContext}

Current Page:
${currentPageText}

Task: Find 2-3 meaningful connections that help understand how concepts build on each other.

Format as JSON array:
[
  {
    "previous_page": <page_number>,
    "concept": "What concept connects",
    "connection": "How it connects (1-2 sentences)"
  }
]

JSON:`;
}

export function getApplicationsPrompt(
  pageText: string,
  userPrefs: UserPreferences
) {
  return `Generate 2-3 real-world applications of the concepts on this page.

User's Goal: ${userPrefs.learning_goals || 'Understanding practical applications'}
User Level: ${userPrefs.target_level || 'intermediate'}

Page Content:
${pageText}

For each application, provide:
1. Application scenario (real-world context)
2. How the concept is used
3. Why it's relevant to: ${userPrefs.learning_goals || 'the field'}

Format as JSON array:
[
  {
    "scenario": "Real-world context",
    "usage": "How concept applies",
    "relevance": "Why it matters"
  }
]

JSON:`;
}

export function getPracticeQuestionsPrompt(
  pageText: string,
  userPrefs: UserPreferences
) {
  const difficultyGuide = {
    beginner: 'Focus on recall and basic comprehension questions',
    intermediate: 'Mix of application and analysis questions',
    advanced: 'Focus on synthesis, evaluation, and complex problem-solving',
  };

  return `Generate 3-4 practice questions based on this page.

User Level: ${userPrefs.target_level || 'intermediate'}
${difficultyGuide[userPrefs.target_level || 'intermediate']}

Page Content:
${pageText}

Create questions that:
1. Test understanding at ${userPrefs.target_level || 'intermediate'} level
2. Align with: ${userPrefs.learning_goals || 'comprehensive learning'}
3. Range from concrete to conceptual

Format as JSON array:
[
  {
    "question": "Question text",
    "type": "recall|application|analysis|synthesis",
    "hint": "Optional hint if stuck"
  }
]

JSON:`;
}

// Chat system prompt for OpenAI
export function getChatSystemPrompt(userPrefs: UserPreferences) {
  const personality = userPrefs.ai_personality || 'helpful and encouraging tutor';
  
  return `You are a ${personality} helping a student understand their textbook.

Student Profile:
- Goal: ${userPrefs.learning_goals || 'Understanding the material'}
- Level: ${userPrefs.target_level || 'intermediate'}

Your approach:
- ${userPrefs.target_level === 'beginner' ? 'Use simple language, provide examples, check understanding frequently' : ''}
- ${userPrefs.target_level === 'intermediate' ? 'Balance clarity with technical accuracy, build on assumed knowledge' : ''}
- ${userPrefs.target_level === 'advanced' ? 'Use precise technical language, explore implications, challenge thinking' : ''}
- Always connect to their goal: ${userPrefs.learning_goals || 'the topic at hand'}
- Be concise but thorough
- Use Socratic questioning when appropriate
- Provide examples from the textbook context

Keep responses focused and educational.`;
}

