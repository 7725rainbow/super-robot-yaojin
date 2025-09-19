import type { VercelRequest, VercelResponse } from '@vercel/node';

// 从 Vercel 的环境变量中读取 API 地址
const WEIBO_HOT_TREND_API = process.env.WEIBO_HOT_TREND_API;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 增加一个健壮性检查，确保环境变量已被正确设置
  if (!WEIBO_HOT_TREND_API) {
    console.error('WEIBO_HOT_TREND_API 环境变量未设置！请在 Vercel 后台进行配置。');
    return res.status(500).json({ error: '后端服务配置错误：微博 API 地址未找到。' });
  }

  try {
    const response = await fetch(WEIBO_HOT_TREND_API, {
      headers: {
        'User-Agent': 'Node.js/Vercel Function; Custom Weibo Hot Trends Fetcher',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // 如果 HTTP 状态码不是 2xx，则抛出错误并包含详细信息
      const errorText = await response.text();
      throw new Error(`从第三方微博热搜 API 抓取数据失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();

    // 检查新的 API 返回的数据结构是否为数组
    if (!Array.isArray(data)) {
      console.error('新的 API 返回数据结构异常或请求失败:', data);
      throw new Error('新的 API 返回数据结构异常或请求失败');
    }

    const allTrends = data;

    // 根据新的 API 字段来映射数据
    const finalTrends = allTrends
      .slice(0, 5) // 只取前5条
      .map((item: any) => ({
        title: item.hot_word || '未知热点',       // 使用新的 'hot_word' 字段
        url: item.hot_word_url || '#'              // 使用新的 'hot_word_url' 字段
      }));
    
    res.status(200).json(finalTrends);

  } catch (error) {
    console.error(`后端服务出错: ${error instanceof Error ? error.message : String(error)}`);
    // 向客户端返回一个统一的错误格式，便于前端处理
    res.status(500).json({ error: `后端服务出错: ${error instanceof Error ? error.message : '未知错误'}` });
  }
}
