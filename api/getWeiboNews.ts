
import type { VercelRequest, VercelResponse } from '@vercel/node';

// [关键] 在这里的引号内，粘贴您上面提供的完整Cookie字符串
const WEIBO_COOKIE = 'SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WW-9ad04DvNWnQsOyr3fjXG5JpX5KMhUgL.Foz4S0nXeKBEeK-2dJLoIEXLxKnL1hBLBonLxK-L1-qL12zLxK-LBKBLBKMLxKnLBK-LB.qLxKML1KeL1-et; SCF=AoJZvR5_GoT-kbb_4Ckk-g4B8EunQas1uh8ZQytRMGgnfG1ueH5iMqNfQpf38DzJKsk89XzfSB87aABjwrQ9ShA.; SUB=_2A25FwTr5DeRhGeRH7FoV8SrOyjmIHXVmvzIxrDV6PUJbktAbLWP8kW1NTYzAepUNwiAWL4yxFbjfOsOPY7EWam43; ALF=1760352169; MLOGIN=1; _T_WM=51651406047; XSRF-TOKEN=d49ab8; WEIBOCN_FROM=1110006030; mweibo_short_token=d9d5794511; M_WEIBOCN_PARAMS=luicode%3D20000174%26lfid%3D102803%26uicode%3D20000174';

// 使用微博官方的手机版API地址
const WEIBO_API_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (WEIBO_COOKIE.includes('粘贴')) {
    return res.status(500).json({ error: '服务器端尚未配置微博Cookie' });
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
