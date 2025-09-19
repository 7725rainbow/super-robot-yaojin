// frontend/api/getWeiboNews.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 使用 TenAPI 服务
const WEIBO_API = "https://tenapi.cn/v2/weibohot";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 使用 TenAPI，并带上 User-Agent 请求头
    const response = await fetch(WEIBO_API, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`请求 TenAPI 微博接口失败: ${response.status}`);
    }
    
    // 增加对返回内容类型的检查，防止HTML错误页导致JSON解析失败
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('TenAPI 微博接口未返回JSON，实际内容:', responseText);
      throw new Error(`TenAPI 微博接口响应格式错误，期望JSON但收到了非JSON内容。`);
    }
    
    const data = await response.json();

    if (data.code !== 200 || !Array.isArray(data.data)) {
      console.error('TenAPI 微博接口返回数据结构异常:', data);
      throw new Error('TenAPI 微博接口返回数据结构异常');
    }

    const allTrends = data.data;

    const finalTrends = allTrends
      .slice(0, 10)
      .map((item: any) => ({
        title: item.name || '未知热点', 
        url: item.url || '#'
      }));
    
    // 设置缓存，减少API请求频率
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300'); // 缓存30分钟
    res.status(200).json(finalTrends);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
