// frontend/api/maoyan-movie.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// [最终方案] 直接请求稳定、公开的 viki.moe 猫眼API
const API_URL = "https://60s.viki.moe/v2/maoyan"; 

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
        throw new Error(`请求猫眼API(viki.moe)失败: ${response.status}`);
    }
    
    const data = await response.json();

    if (data.code !== 200 || !Array.isArray(data.data)) {
      throw new Error('猫眼API(viki.moe)返回数据结构异常');
    }

    // 适配viki.moe的数据结构，返回前端需要的格式
    const finalMovies = data.data.slice(0, 5).map((item: any) => ({
      title: item.title,
      rating: item.rating || '暂无评分', // viki.moe直接提供了rating字段
      url: item.url,
    }));
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.status(200).json(finalMovies);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务(/maoyan-movie)出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
