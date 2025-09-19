// frontend/api/getWeiboNews.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 从 Vercel 的环境变量中读取新的 API 地址
const WEIBO_HOT_TREND_API = process.env.WEIBO_HOT_TREND_API;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!WEIBO_HOT_TREND_API) {
    console.error('WEIBO_HOT_TREND_API 环境变量未设置！请在 Vercel 后台进行配置。');
    return res.status(500).json({ error: '后端服务配置错误：微博 API 地址未找到。' });
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
        throw new Error(`从第三方微博热搜API抓取数据失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();

    // 1. **更新数据结构检查**
    // 新的 API 返回结构为 { "Data": { "data": [...] } }
    if (!data || !data.Data || !Array.isArray(data.Data.data)) {
        console.error('新API返回数据结构异常:', data);
        throw new Error('新API返回数据结构异常或请求失败');
    }

    const allTrends = data.Data.data;

    // 2. **更新数据字段映射**
    // 新 API 使用 Title 和 Url，而非 title 和 url
    const finalTrends = allTrends
      .slice(0, 5)
      .map((item: any) => ({
        title: item.Title || '未知热点', // 字段名更新为 Title
        url: item.Url || '#'           // 字段名更新为 Url
      }));
    
    res.status(200).json(finalTrends);

  } catch (error) {
    console.error(`后端服务出错: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: `后端服务出错: ${error instanceof Error ? error.message : '未知错误'}` });
  }
}
