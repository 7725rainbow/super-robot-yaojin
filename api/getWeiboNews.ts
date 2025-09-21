import type { VercelRequest, VercelResponse } from '@vercel/node';

const WEIBO_COOKIE = process.env.WEIBO_COOKIE;

// 使用你指定的API地址
const WEIBO_API_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 检查Cookie是否已配置
  if (!WEIBO_COOKIE) {
    return res.status(500).json({ error: '后端服务尚未配置微博Cookie' });
  }

  try {
    const response = await fetch(WEIBO_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'Cookie': WEIBO_COOKIE,
      }
    });

    if (!response.ok) {
      throw new Error(`请求微博官方API失败: ${response.status}`);
    }
    
    // 返回JSON数据
    const data = await response.json();

    // 解析你提供的API地址返回的复杂JSON结构
    const cardGroup = data?.data?.cards?.[0]?.card_group;
    if (!Array.isArray(cardGroup)) {
      console.error('微博API返回数据结构异常或Cookie失效:', data);
      throw new Error('微博API返回数据结构异常或Cookie失效');
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
