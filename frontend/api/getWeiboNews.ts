// frontend/api/getWeiboNews.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// **从 Vercel 的环境变量中读取 API 地址**
// 这样可以避免将敏感信息硬编码到代码中，方便管理和切换 API
const WEIBO_HOT_TREND_API = process.env.WEIBO_HOT_TREND_API;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 增加一个健壮性检查，确保环境变量已被正确设置
  if (!WEIBO_HOT_TREND_API) {
    console.error('WEIBO_HOT_TREND_API 环境变量未设置！请在 Vercel 后台进行配置。');
    return res.status(500).json({ error: '后端服务配置错误：微博 API 地址未找到。' });
  }

  try {
    const response = await fetch(WEIBO_HOT_TREND_API, {
      // 对于第三方 API，使用简单的 headers 即可，避免不必要的复杂性
      headers: {
        'User-Agent': 'Node.js/Vercel Function; Custom Weibo Hot Trends Fetcher',
        'Accept': 'application/json', // 明确我们期望 JSON 响应
      },
      // 可以选择添加超时控制，防止请求长时间挂起
      // signal: AbortSignal.timeout(5000) // 例如，5秒超时
    });

    if (!response.ok) {
        // 如果 HTTP 状态码不是 2xx，则抛出错误并包含详细信息
        const errorText = await response.text();
        throw new Error(`从第三方微博热搜API抓取数据失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();

    // 2. **根据第三方 API 的返回结构来解析数据**
    // 检查数据的基本结构，防止 API 结构突然变化导致 TypeError
    if (!data || data.code !== 200 || !Array.isArray(data.data)) {
        console.error('第三方API返回数据结构异常或状态码非200:', data);
        throw new Error('第三方API返回数据结构异常或请求失败');
    }

    const allTrends = data.data; // 直接就是热搜列表

    // 只取前5条，并进行格式化
    const finalTrends = allTrends
      .slice(0, 5) // 只取前5条
      .map((item: any) => ({
        title: item.title || '未知热点', // 使用第三方API的 title 字段
        url: item.url || '#' // 使用第三方API的 url 字段
      }));
    
    res.status(200).json(finalTrends);

  } catch (error) {
    console.error(`后端服务出错: ${error instanceof Error ? error.message : String(error)}`);
    // 向客户端返回一个统一的错误格式，便于前端处理
    res.status(500).json({ error: `后端服务出错: ${error instanceof Error ? error.message : '未知错误'}` });
  }
}
