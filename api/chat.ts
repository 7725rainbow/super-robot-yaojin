// pages/api/chat.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as character from '../core/characterSheet'; 
import { Message, IntimacyLevel, Flow } from '../types'; 
import { handleDaoistDailyChoice } from '../services/daoistDailyService'; 

// 获取环境变量中的 API 密钥
const API_KEY = process.env.GEMINI_API_KEY;

// 在函数内部进行环境变量检查，以返回优雅的错误响应
// 而不是在全局抛出异常导致服务冷启动失败
const genAI = new GoogleGenerativeAI(API_KEY || '');
const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// 内部函数：直接调用其他 API 路由的逻辑，避免外部 fetch
// 注意：你需要将 /api/getWeiboNews 和 /api/douban-movie 的逻辑
// 移动到这里或封装成一个可直接调用的服务。
// 这里的 fetch 只是为了演示，实际应用中应避免。
async function getWeiboNews(): Promise<any[] | null> {
    try {
        const response = await fetch('https://your-domain.com/api/getWeiboNews'); // 使用绝对路径
        if (!response.ok) throw new Error('Failed to fetch Weibo news from backend API');
        return await response.json();
    } catch (error) {
        console.error("Failed to get Weibo news:", error);
        return null;
    }
}

async function getDoubanMovies(): Promise<any[] | null> {
    try {
        const response = await fetch('https://your-domain.com/api/douban-movie'); // 使用绝对路径
        if (!response.ok) throw new Error('Failed to fetch Douban movie info from backend API');
        return await response.json();
    } catch (error) {
        console.error("Failed to get movie info:", error);
        return null;
    }
}

// 后端函数：处理对话分流
// (保持原样，因为这个逻辑是合理的)
async function runTriage(userInput: string, userName: string, intimacy: IntimacyLevel): Promise<any> {
    const triagePrompt = `...`; // 保持你的提示词
    const result = await chatModel.generateContent(triagePrompt);
    const responseText = result.response.text().trim();
    try {
        const triageAction = JSON.parse(responseText);
        return triageAction;
    } catch (e) {
        return { action: 'CONTINUE_CHAT' };
    }
}

// 后端函数：处理核心对话逻辑
async function* sendMessageStream(
    text: string,
    imageBase64: string | null,
    history: Message[],
    intimacy: IntimacyLevel,
    userName: string,
    flow: Flow
): AsyncGenerator<Partial<Message>> {
    try {
        // --- 优化点1: 优先处理无需 AI 模型的请求 ---
        if (flow === 'daily') {
            const staticResponse = handleDaoistDailyChoice(text);
            yield { text: staticResponse, isLoading: false };
            return; // 直接返回，不再调用 AI
        }

        let systemInstruction = getSystemInstruction(intimacy, userName, flow); 
        let externalContext: string | null = null;
        let finalPrompt = text;
        
        // --- 优化点2: 按需获取外部数据 ---
        if (flow === 'news') {
            if (text.includes('新鲜事')) {
                systemInstruction += `\n${character.newsTopic.subTopics['新鲜事']}`;
                const newsData = await getWeiboNews(); // 调用内部函数
                if (newsData && newsData.length > 0) {
                    const formattedTrends = newsData.map((item, index) => `[${index + 1}] ${item.title}`).join('\n');
                    externalContext = `以下是微博热搜榜的新鲜事：\n\n${formattedTrends}`;
                }
            } else if (text.includes('上映新片')) {
                systemInstruction += `\n${character.newsTopic.subTopics['上映新片']}`;
                const movieData = await getDoubanMovies(); // 调用内部函数
                if (movieData && movieData.length > 0) {
                    const formattedMovies = movieData.map((movie, index) => `[${index + 1}] 《${movie.title}》- 评分: ${movie.score} (链接: ${movie.url})`).join('\n');
                    externalContext = `本道仙刚瞅了一眼，最近上映的电影倒是有点意思，这几部你看过吗？\n\n${formattedMovies}`;
                }
            } else if (text.includes('小道仙的幻想')) {
                systemInstruction += `\n${character.newsTopic.subTopics['小道仙的幻想']}`;
            }
        }
        
        if (externalContext) {
            systemInstruction += `\n\n**请你基于以下外部参考资料，与用户展开对话**:\n${externalContext}`;
        }
        
        const apiMessages = convertToApiMessages(history, systemInstruction, finalPrompt, imageBase64);
        
        const response = await chatModel.generateContentStream({
            contents: apiMessages,
        });
        
        for await (const chunk of response.stream) {
            const textDelta = chunk.text;
            if (textDelta) {
                yield { text: textDelta, isLoading: true };
            }
        }
        
        yield { isLoading: false };

    } catch (error) {
        console.error("API error:", error);
        // 统一处理流中的错误
        let errorType: 'rate_limit' | 'safety' | 'server' | 'unknown' = 'server';
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('safety')) errorType = 'safety';
            else if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) errorType = 'rate_limit';
            else if (message.includes('server error') || message.includes('500') || message.includes('503')) errorType = 'server';
            else errorType = 'unknown';
        }
        yield { text: '', errorType: errorType, isLoading: false };
    }
}

const getSystemInstruction = (intimacy: IntimacyLevel, userName: string, flow: Flow): string => {
    // (保持原样)
};

const convertToApiMessages = (history: Message[], systemInstruction: string, text: string, imageBase64: string | null) => {
    const apiMessages: any[] = [{ role: 'system', parts: [{ text: systemInstruction }] }];
    for (const msg of history) {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        const parts: any[] = [];
        if (msg.text) { parts.push({ text: msg.text }); }
        // 优化点3: 使用 msg 中的 mimeType
        if (msg.imageBase64 && msg.imageMimeType) {
            parts.push({
                inlineData: {
                    data: msg.imageBase64,
                    mimeType: msg.imageMimeType
                }
            });
        }
        if (parts.length > 0) { apiMessages.push({ role, parts }); }
    }
    const currentUserParts: any[] = [];
    if (text) { currentUserParts.push({ text }); }
    if (imageBase64) {
        // 优化点4: 用户上传的图片也应传入 mimeType
      currentUserParts.push({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg', // 这里需要从前端获取正确的类型
        },
      });
    }
    apiMessages.push({ role: 'user', parts: currentUserParts });
    return apiMessages;
};

// Vercel/Next.js 会将这个文件映射到 /api/chat 路由
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // 优化点5: 在请求处理时检查环境变量
    if (!API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured.' });
    }

    try {
        const {
            text,
            imageBase64,
            history,
            intimacy,
            userName,
            currentFlow
        } = req.body;

        if (!text && !imageBase64) {
            return res.status(400).json({ error: 'Text or image is required' });
        }
        
        res.writeHead(200, {
            'Content-Type': 'text/plain', 
            'Transfer-Encoding': 'chunked',
        });

        for await (const chunk of sendMessageStream(
            text,
            imageBase64,
            history,
            intimacy,
            userName,
            currentFlow
        )) {
            // 优化点6: 确保在流开始前检查
            res.write(JSON.stringify(chunk) + '\n');
        }

        res.end();

    } catch (error) {
        console.error('API handler error:', error);
        // 优化点7: 统一错误处理，避免重复发送
        if (res.writableEnded) {
          console.error("Response already sent, cannot send error.");
          return;
        }
        res.status(500).json({ error: '后端服务处理失败' });
    }
}
