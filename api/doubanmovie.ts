// frontend/api/doubanmovie.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// [最终方案] 调用你自己部署的、稳定可靠的API服务
const MY_API_URL = "https://dailyhot-puce.vercel.app/douban-movie";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 任务非常简单：直接请求自己的API
    const response = await fetch(MY_API_URL);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`请求自部署API(/douban-movie)失败: ${response.status}`, errorText);
        return res.status(response.status).send(errorText);
    }

    const data = await response.json();

    // 我们只把API返回的核心 data 字段透传给前端
    const finalData = data.data || [];
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.status(200).json(finalData);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务(/douban-movie)出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
