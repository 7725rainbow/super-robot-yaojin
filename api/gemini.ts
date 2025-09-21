import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 获取环境变量中的API密钥
// 重要：不要将API密钥直接写在这里！
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('未找到 GEMINI_API_KEY 环境变量。请在Vercel或本地 .env 文件中配置。');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 确保只处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const { prompt } = req.body;

  // 确保请求体中包含 prompt
  if (!prompt) {
    return res.status(400).json({ error: '缺少 `prompt` 参数' });
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 返回成功响应
    res.status(200).json({ text });
  } catch (error) {
    console.error('调用 Gemini API 失败:', error);
    
    let errorMessage = '未知错误';
    if (error instanceof Error) {
        errorMessage = error.message;
    }

    // 返回错误响应
    res.status(500).json({ error: '调用 Gemini API 失败', details: errorMessage });
  }
}
