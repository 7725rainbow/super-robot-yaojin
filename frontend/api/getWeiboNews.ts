// frontend/api/getWeiboNews.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const WEIBO_HOT_TREND_API = 'https://weibo.com/ajax/side/hotSearch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. 从前端的请求中获取 category 参数，例如 /api/getWeiboNews?category=entertainment
    const category = req.query.category as string;

    const response = await fetch(WEIBO_HOT_TREND_API, {
      headers: { /* ... headers ... */ }
    });

    if (!response.ok) throw new Error(`抓取微博数据失败`);
    
    const data = await response.json();
    const allTrends = data.data.realtime;

    let filteredTrends = [];

    // 2. 根据前端传来的 category 参数，执行不同的筛选逻辑
    if (category === 'gossip') {
      // 如果前端要的是“明星八卦”
      filteredTrends = allTrends.filter((item: any) => item.category === '文娱榜');
    } else if (category === 'social_news') {
      // 如果前端要的是“社会热点”
      filteredTrends = allTrends.filter((item: any) => item.category === '社会');
    } else {
      // 如果没有指定，或者指令不对，默认返回综合列表
      filteredTrends = allTrends;
    }

    // 3. 保底策略：如果筛选后没内容，返回综合榜前5
    const finalTrends = (filteredTrends.length > 0 ? filteredTrends : allTrends)
      .slice(0, 5)
      .map((item: any) => ({
        title: item.word,
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`
      }));
    
    res.status(200).json(finalTrends);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '后端服务出错' });
  }
}