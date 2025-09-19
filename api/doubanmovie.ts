// api/douban-movie.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 今日热榜提供的豆瓣电影接口
const DOUBAN_MOVIE_API = "https://api-hot.imsyy.top/douban-movie";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch(DOUBAN_MOVIE_API, {
      headers: {
        'User-Agent': 'Node.js/Vercel Function; Custom Douban Movie Fetcher',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`无法从第三方豆瓣电影API抓取数据: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();

    // 假设 API 返回一个包含 'data' 字段的对象，且 'data' 是一个数组
    if (!data || !Array.isArray(data.data)) {
      console.error('API返回数据结构异常:', data);
      throw new Error('API返回数据结构异常');
    }

    const allMovies = data.data;

    // 只取前5部电影，并进行格式化
    const finalMovies = allMovies
      .slice(0, 5)
      .map((item: any) => ({
        // 假设 API 返回的字段是 title, rating, link 等
        title: item.title || '未知电影', 
        rating: item.rating || '无评分',
        url: item.url || '#'
      }));
    
    res.status(200).json(finalMovies);

  } catch (error) {
    console.error(`后端服务出错: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: `后端服务出错: ${error instanceof Error ? error.message : '未知错误'}` });
  }
}