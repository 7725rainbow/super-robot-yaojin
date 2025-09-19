// frontend/api/getWeiboNews.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Read the new API address from Vercel's environment variables
const WEIBO_HOT_TREND_API = process.env.WEIBO_HOT_TREND_API;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check if the environment variable is set
  if (!WEIBO_HOT_TREND_API) {
    console.error('WEIBO_HOT_TREND_API environment variable is not set! Please configure it in your Vercel dashboard.');
    return res.status(500).json({ error: 'Backend service configuration error: Weibo API address not found.' });
  }

  try {
    const response = await fetch(WEIBO_HOT_TREND_API, {
      headers: {
        'User-Agent': 'Node.js/Vercel Function; Custom Weibo Hot Trends Fetcher',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch data from the third-party Weibo API: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();

    // 1. **Update Data Structure Check**
    // The new API returns a simple array, so we check if 'data' is an array.
    if (!Array.isArray(data)) {
      console.error('New API returned an invalid data structure:', data);
      throw new Error('New API returned an invalid data structure or the request failed.');
    }

    const allTrends = data;

    // 2. **Update Data Field Mapping**
    // The new API uses 'hot_word' and 'hot_word_url'.
    const finalTrends = allTrends
      .slice(0, 5)
      .map((item: any) => ({
        title: item.hot_word || 'Unknown Hot Trend', // Field name is now hot_word
        url: item.hot_word_url || '#'              // Field name is now hot_word_url
      }));
    
    res.status(200).json(finalTrends);

  } catch (error) {
    console.error(`Backend service error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: `Backend service error: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}
