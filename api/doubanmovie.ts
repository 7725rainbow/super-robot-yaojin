// frontend/api/douban-movie.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 使用 TenAPI 的豆瓣服务
const DOUBAN_API = "https://tenapi.cn/v2/doubanresou";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 使用 TenAPI，并带上 User-Agent 请求头
    const response = await fetch(DOUBAN_API, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`请求 TenAPI 豆瓣接口失败: ${response.status}`);
    }

    // 增加对返回内容类型的检查
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('TenAPI 豆瓣接口未返回JSON，实际内容:', responseText);
      throw new Error(`TenAPI 豆瓣接口响应格式错误，期望JSON但收到了非JSON内容。`);
    }
    
    const data = await response.json();

    if (data.code !== 200 || !Array.isArray(data.data)) {
      console.error('TenAPI 豆瓣接口返回数据结构异常:', data);
      throw new Error('TenAPI 豆瓣接口返回数据结构异常');
    }

    const allMovies = data.data;

    const finalMovies = allMovies
      .slice(0, 5)
      .map((item: any) => ({
        title: item.name || '未知电影', 
        rating: item.hot || '暂无评分', // 使用热度值作为评分替代
        url: item.url || '#'
      }));
    
    // 设置缓存
    res.setHeader('Cache-control', 's-maxage=3600, stale-while-revalidate=600'); // 缓存1小时
    res.status(200).json(finalMovies);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
