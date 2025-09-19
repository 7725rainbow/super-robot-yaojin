// frontend/api/getWeiboNews.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 调用你自己部署的、稳定可靠的API服务
const MY_API_BASE_URL = "https://dailyhot-puce.vercel.app"; // 您自己的API地址

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // [修正] 在请求头中，除了User-Agent，再增加一个Referer
    const response = await fetch(`${MY_API_BASE_URL}/weibo`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.weibo.cn/'
      }
    });

    if (!response.ok) {
        // 如果请求失败，尝试读取并返回更详细的错误信息
        const errorText = await response.text();
        console.error(`请求自部署API失败: ${response.status}`, errorText);
        throw new Error(`请求自部署API失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();

    if (!data || !Array.isArray(data.data)) throw new Error('自部署API返回数据结构异常');

    const finalTrends = data.data.slice(0, 10).map((item: any) => ({
        title: item.title,
        url: item.url,
    }));
    
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.status(200).json(finalTrends);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
