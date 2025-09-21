import type { VercelRequest, VercelResponse } from '@vercel/node';

// Read the cookie securely from the environment variable
const WEIBO_COOKIE = process.env.WEIBO_COOKIE;

const WEIBO_API_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // If the environment variable isn't set, return an error
  if (!WEIBO_COOKIE) {
    return res.status(500).json({ error: '后端服务尚未配置微博Cookie' });
  }

  try {
    const response = await fetch(WEIBO_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1',
        'Cookie': WEIBO_COOKIE,
      }
    });

    if (!response.ok) {
      throw new Error(`请求微博官方API失败: ${response.status}`);
    }
    
    const data = await response.json();

    const cardGroup = data?.data?.cards?.[0]?.card_group;
    if (!Array.isArray(cardGroup)) {
      console.error('微博官方API返回数据结构异常或Cookie失效:', data);
      throw new Error('微博官方API返回数据结构异常或Cookie失效');
    }

    const finalTrends = cardGroup
      .filter((item: any) => item.desc)
      .slice(0, 10)
      .map((item: any) => ({
        title: item.desc,
        url: `https://m.s.weibo.com/weibo?q=${encodeURIComponent(`#${item.desc}#`)}`
      }));
    
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.status(200).json(finalTrends);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务(/weibo)出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
