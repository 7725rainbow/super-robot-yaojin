import type { VercelRequest, VercelResponse } from '@vercel/node';

const WEIBO_HOT_TREND_API = "https://api-hot.imsyy.top/weibo";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // 假设新的 API 返回一个包含 'data' 字段的对象，且 'data' 是一个数组
    if (!data || !Array.isArray(data.data)) {
      console.error('API返回数据结构异常:', data);
      throw new Error('API返回数据结构异常');
    }

    const allTrends = data.data;

    // 只取前10条，并进行格式化
    const finalTrends = allTrends
      .slice(0, 10)
      .map((item: any) => ({
        // 将字段名从 name 和 link 修正为 title 和 url
        title: item.title || '未知热点', 
        url: item.url || '#'
      }));
    
    res.status(200).json(finalTrends);

  } catch (error) {
    console.error(`后端服务出错: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: `后端服务出错: ${error instanceof Error ? error.message : '未知错误'}` });
  }
}
