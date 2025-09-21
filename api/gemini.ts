import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variables.
// IMPORTANT: Never hardcode your API key!
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable not found. Please configure it in Vercel or a local .env file.');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const { prompt } = req.body;

  // Ensure the request body contains a prompt.
  if (!prompt) {
    return res.status(400).json({ error: 'Missing `prompt` parameter.' });
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Return a successful response.
    res.status(200).json({ text });
  } catch (error) {
    console.error('Failed to call Gemini API:', error);
    
    // Use a type guard to safely access the error message.
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    }

    // Return an error response with the specific message.
    res.status(500).json({ error: 'Failed to call Gemini API', details: errorMessage });
  }
}
