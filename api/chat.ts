// pages/api/chat.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUserMessage } from '../../services/geminiService';
import { Message, IntimacyLevel, Flow } from '../../types'; 

// Vercel/Next.js 会自动将这个文件映射到 /api/chat 路由
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 从前端发送的请求体中解析出所有需要的数据
    const { 
        userId, 
        text, 
        imageFile, /
        history, 
        intimacy, 
        userName, 
        currentFlow 
    } = req.body;

    if (!text && !imageFile) {
        return res.status(400).json({ error: 'Text or image is required' });
    }
    
    // 调用我们的核心对话处理引擎，并传入所有参数
    const responseGenerator = handleUserMessage(
        userId || 'default_user_id',
        text || '',
        imageFile || null,
        history || [],
        intimacy || { level: 1, name: '初见', progress: 0 },
        userName || '凡人',
        currentFlow || 'default'
    );
    
    // 设置响应头，准备以流式方式返回数据
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    });

    // 遍历从引擎返回的每一个数据块，并将其发送给前端
    for await (const chunk of responseGenerator) {
        res.write(JSON.stringify(chunk) + '\n');
    }

    // 所有数据块发送完毕，结束响应
    res.end();

  } catch (error) {
    console.error('API handler error:', error);
    // 由于响应头已发送，我们无法再更改状态码
    // 只能在服务器端记录错误
  }
}