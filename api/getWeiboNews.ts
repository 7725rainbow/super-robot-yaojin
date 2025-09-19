// frontend/api/getWeiboNews.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// [最终方案] 调用你自己部署在 Vercel 上的、稳定可靠的API服务
const MY_API_BASE_URL = "https://dailyhot-puce.vercel.app"; // 已更新为您自己的API地址

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch(`${MY_API_BASE_URL}/weibo`); // 路径是 /weibo

    if (!response.ok) throw new Error(`请求自部署API失败: ${response.status}`);
    
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
