// Vercel Serverless Function for Text Explanation
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface ExplainRequest {
  text: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: ExplainRequest = await req.json();
    const { text } = body;

    if (!text || text.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Text must be between 1 and 1000 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call GROQ for explanation
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful tutor. Explain the given text clearly and concisely in 2-3 sentences. Use simple language.',
          },
          {
            role: 'user',
            content: `Explain this: "${text}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`GROQ API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqJson = await groqResponse.json();
    const explanation = groqJson.choices[0]?.message?.content || 'Unable to generate explanation';

    return new Response(
      JSON.stringify({ explanation }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[Explain API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate explanation' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export const config = {
  runtime: 'edge',
};

