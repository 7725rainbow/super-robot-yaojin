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

    if (!data || !Array.isArray(data.data)) {
      console.error('API返回数据结构异常:', data);
      throw new Error('API返回数据结构异常');
    }

    const allMovies = data.data;

    const finalMovies = allMovies
      .slice(0, 5)
      .map((item: any) => ({
        // [修正] 将字段名与API实际返回的字段匹配
        title: item.name || '未知电影', 
        rating: item.grade || '无评分',
        url: item.link || '#'
      }));
    
    // [优化] 增加缓存头，大幅提升API响应速度并减少资源消耗
    // 's-maxage=3600' 表示在Vercel边缘网络缓存1小时
    // 'stale-while-revalidate=60' 表示缓存过期后的60秒内，允许返回旧缓存，同时后台异步刷新
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=60');
    
    res.status(200).json(finalMovies);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`后端服务出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
