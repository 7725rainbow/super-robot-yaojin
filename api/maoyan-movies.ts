// frontend/api/maoyan-movie.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';

// 猫眼电影 TOP100 榜单页面
const MAOYAN_TOP100_URL = "https://www.maoyan.com/board/4";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await axios.get(MAOYAN_TOP100_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);

    const movies: any[] = [];
    
    // 使用 Cheerio 抓取榜单信息
    $('dl.board-wrapper dd').each((index, element) => {
      const title = $(element).find('.name a').text().trim();
      const actors = $(element).find('.star').text().trim();
      const releaseTime = $(element).find('.releasetime').text().trim();
      const movieUrl = 'https://www.maoyan.com' + $(element).find('.name a').attr('href');
      
      // 猫眼榜单不直接显示评分，我们用上映时间或主演信息作为替代
      movies.push({
        title: title,
        rating: releaseTime || actors, 
        url: movieUrl,
      });
    });

    // 只返回前5条结果
    const top5Movies = movies.slice(0, 5);
    
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600'); // 缓存一天
    res.status(200).json(top5Movies);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`后端服务(/maoyan-movie)出错: ${errorMessage}`);
    res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
  }
}
