// frontend/api/douban-movie.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// [最终方案] 回到最初的 imsyy.top 服务
const API_URL = "https://hot.imsyy.top/douban-movie";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch(API_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        }
    });

    if (!response.ok) throw new Error(`请求API失败: ${response.status}`);

    const data = await response.json();

    if (data.code !== 200 || !Array.isArray(data.data)) {
        throw new Error('API返回数据结构异常');
    }

    const finalMovies = data.data.slice(0, 5).map((item: any) => ({
      title: item.title,
      rating: item.rating,
      url: item.url,
    }));
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.status(200).json(finalMovies);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
