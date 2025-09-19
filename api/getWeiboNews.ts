// frontend/api/getWeiboNews.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// [新] 直接使用微博官方的移动端API
const WEIBO_OFFICIAL_API = "https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // [新] 模拟官方API所需要的请求头
    const response = await fetch(WEIBO_OFFICIAL_API, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.weibo.cn/', // 增加 Referer 头，更安全
      }
    });

    if (!response.ok) {
      throw new Error(`请求微博官方API失败: ${response.status}`);
    }
    
    const data = await response.json();

    // [新] 根据微博官方API的返回结构进行数据解析
    // 微博的数据藏在 data.data.band_list 路径下
    if (!data || !data.data || !Array.isArray(data.data.band_list)) {
      console.error('微博官方API返回数据结构异常:', data);
      throw new Error('微博官方API返回数据结构异常');
    }

    const allTrends = data.data.band_list;

    const finalTrends = allTrends
      .filter((item: any) => item.word) // 确保 item.word 存在
      .slice(0, 10)
      .map((item: any) => ({
        // [新] 适配官方API的字段名 (title -> word)
        title: item.word, 
        url: `https://m.s.weibo.com/weibo?q=${encodeURIComponent(`#${item.word}#`)}`
      }));
    
    // 缓存半小时
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.status(200).json(finalTrends);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
