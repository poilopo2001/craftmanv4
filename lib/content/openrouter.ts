import { rateLimiter } from './rate-limiter';
import { APIError, ValidationError } from './errors';

const OPENROUTER_API_KEY = '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';
const SITE_URL = 'https://quoteease.com';
const SITE_NAME = 'QuoteEase';

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export async function generateContent(prompt: string): Promise<string> {
  if (!prompt?.trim()) {
    throw new ValidationError('Prompt cannot be empty');
  }

  try {
    await rateLimiter.waitForToken();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "openai/gpt-4o-mini",
        "messages": [
          {
            "role": "system",
            "content": "You are a professional content generator for a multilingual website about home improvement and professional services in Luxembourg. Generate detailed, accurate, and engaging content."
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
        "temperature": 0.7,
        "max_tokens": 1000
      })
    });

    if (!response.ok) {
      throw new APIError(
        `OpenRouter API error: ${response.statusText}`,
        response.status
      );
    }

    const data: OpenRouterResponse = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new ValidationError('Invalid response format from API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof APIError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new APIError(
      `Failed to generate content: ${error.message}`,
      500
    );
  }
}