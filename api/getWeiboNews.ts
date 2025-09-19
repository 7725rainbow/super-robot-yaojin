// 文件路径: DailyHotApi/src/routes/weibo.ts

import { Router } from "express";
import { get } from "axios"; // 确保 axios 被导入

const router = Router();

// [新] 定义新的、更稳定的API地址
const NEW_WEIBO_API_URL = "https://60s.viki.moe/v2/weibo";

const getWeibo = async () => {
  try {
    // [新] 请求新的API地址
    const response = await get(NEW_WEIBO_API_URL, {
      headers: {
        // [保留] 加上User-Agent是个好习惯
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
      },
    });

    // [新] 根据新API的返回格式进行检查
    if (response.data.code !== 200 || !Array.isArray(response.data.data)) {
      throw new Error("viki.moe API returned an unexpected structure.");
    }

    const allTrends = response.data.data;

    // [新] 适配新API的数据字段 (title, url)
    // 注意：imsyy的原始格式是title,hot,url，我们这里保持一致
    const result = allTrends.map((v: any) => {
      return {
        title: v.title,
        hot: v.hot,
        url: v.url,
      };
    });

    return {
      from: "viki.moe", // 标注数据来源
      data: result,
    };

  } catch (error) {
    console.error("Error fetching from viki.moe Weibo API:", error);
    // 在出错时返回一个标准的空数据结构，避免服务崩溃
    return {
      from: "error",
      data: [],
    };
  }
};

router.get("/", async (req, res) => {
  const data = await getWeibo();
  res.send(data);
});

export default router;
