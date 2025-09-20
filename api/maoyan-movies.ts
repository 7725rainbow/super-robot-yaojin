import { Router } from "express";
import { load } from "cheerio";
import axios from "axios";

const router = Router();

// 我已经将您提供的Cookie值填入下方
const DOUBAN_COOKIE = `bid=Y3JPVfYiX2c; dbcl2="220166608:hB+3fWx6YCQ"`; 

// [修改] 将城市更改为上海 (shanghai)
const getDoubanMovie = async () => {
  const url = `https://movie.douban.com/cinema/nowplaying/shanghai/`; 
  try {
    if (DOUBAN_COOKIE.includes('YOUR_')) {
      throw new Error("服务器端尚未配置豆瓣Cookie");
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'Cookie': DOUBAN_COOKIE, // 使用您的豆瓣Cookie
      },
    });

    const $ = load(response.data);
    
    const listDom = $('#nowplaying .list-item');
    
    const listData = listDom.toArray().map((item) => {
      const dom = $(item);
      const url = dom.find(".poster a").attr("href") || undefined;
      const score = dom.find(".subject-rate").text().trim() || "暂无评分";
      const title = dom.data('title') || "未知电影";
      
      return {
        title: title,
        rating: score,
        url: url,
      };
    }).slice(0, 10);
    
    return {
        from: "self-hosted-douban-cookie-shanghai",
        data: listData,
    };

  } catch (error) {
    console.error("抓取豆瓣电影(Cookie)时出错:", error);
    throw error;
  }
};

router.get("/", async (req, res) => {
  try {
    const data = await getDoubanMovie();
    res.send(data);
  } catch (e: any) {
    res.status(500).send({ error: e.message });
  }
});

export default router;
