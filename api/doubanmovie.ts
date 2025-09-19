// frontend/api/douban-movie.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
// [新] 导入我们刚刚安装的 cheerio 库
import * as cheerio from 'cheerio';

// [新] 豆瓣“正在热映”的北京地区网页地址
const DOUBAN_NOWPLAYING_URL = "https://movie.douban.com/cinema/nowplaying/beijing/";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 像浏览器一样请求网页HTML
    const response = await fetch(DOUBAN_NOWPLAYING_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      throw new Error(`请求豆瓣网页失败: ${response.status}`);
    }
    
    // 获取网页的HTML文本内容
    const html = await response.text();
    
    // [新] 使用 cheerio 加载HTML，让我们可以像jQuery一样操作它
    const $ = cheerio.load(html);
    
    // [新] 定位到 id 为 "nowplaying" 的区域中的电影列表
    const movieListItems = $('#nowplaying .list-item');
    
    const finalMovies: any[] = [];

    // [新] 遍历每一个电影条目，并从中提取信息
    movieListItems.each((index, element) => {
      // 使用 .data() 方法获取 HTML 元素上的 data-* 属性值
      const title = $(element).data('title');
      const rating = $(element).data('score');
      const url = $(element).find('.poster a').attr('href');

      if (title && url) {
        finalMovies.push({
          title: title,
          rating: rating || '暂无评分',
          url: url
        });
      }
    });

    // 只返回前5条结果
    const top5Movies = finalMovies.slice(0, 5);

    // 缓存1小时
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.status(200).json(top5Movies);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
