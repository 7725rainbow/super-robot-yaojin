// pages/api/chat.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as character from '../core/characterSheet'; 
import { Message, IntimacyLevel, Flow, DivinationResult, DiceResult, GroundingChunk } from '../types'; 
import { getDaoistDailyIntro, handleDaoistDailyChoice } from '../services/daoistDailyService'; 

// === 迁移自前端的后端函数 ===
async function getWeiboNewsFromBackend(): Promise<any[] | null> {
    try {
        const response = await fetch('/api/getWeiboNews');
        if (!response.ok) throw new Error('Failed to fetch Weibo news from backend API');
        return await response.json();
    } catch (error) {
        console.error("Failed to get Weibo news:", error);
        return null;
    }
}

async function getDoubanMoviesFromBackend(): Promise<any[] | null> {
    try {
        const response = await fetch('/api/douban-movie');
        if (!response.ok) throw new Error('Failed to fetch Douban movie info from backend API');
        return await response.json();
    } catch (error) {
        console.error("Failed to get movie info:", error);
        return null;
    }
}
// === 迁移结束 ===

// 获取环境变量中的API密钥
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const triageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// 后端函数：处理对话分流
async function runTriage(userInput: string, userName: string, intimacy: IntimacyLevel): Promise<any> {
    const triagePrompt = `
      # 指令
      你是一个对话分流助手。你的任务是根据用户的输入，严格匹配以下七种情况中的一种，并仅输出与该情况对应的JSON对象。不要添加任何额外的解释或文字。
      # 当前用户信息
      - 昵称: ${userName}
      - 亲密度: ${intimacy.level}
      # 分流规则
      \`\`\`json
      ${JSON.stringify(character.triageRules, null, 2)}
      \`\`\`
      # 用户输入
      "${userInput}"
      # 你的输出 (必须是以下JSON对象之一):
    `;
    
    const result = await triageModel.generateContent(triagePrompt);
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
        let systemInstruction = getSystemInstruction(intimacy, userName, flow); 
        let externalContext: string | null = null;
        let finalPrompt = text;
        
        if (flow === 'news') {
            if (text.includes('新鲜事')) {
                systemInstruction += `\n${character.newsTopic.subTopics['新鲜事']}`;
                const newsData = await getWeiboNewsFromBackend(); 
                if (newsData && newsData.length > 0) {
                    const formattedTrends = newsData.map((item, index) => `[${index + 1}] ${item.title}`).join('\n');
                    externalContext = `以下是微博热搜榜的新鲜事：\n\n${formattedTrends}`;
                }
            } else if (text.includes('上映新片')) {
                systemInstruction += `\n${character.newsTopic.subTopics['上映新片']}`;
                const movieData = await getDoubanMoviesFromBackend(); 
                if (movieData && movieData.length > 0) {
                    const formattedMovies = movieData.map((movie, index) => `[${index + 1}] 《${movie.title}》- 评分: ${movie.score} (链接: ${movie.url})`).join('\n');
                    externalContext = `本道仙刚瞅了一眼，最近上映的电影倒是有点意思，这几部你看过吗？\n\n${formattedMovies}`;
                }
            } else if (text.includes('小道仙的幻想')) {
                systemInstruction += `\n${character.newsTopic.subTopics['小道仙的幻想']}`;
            }
        } else if (flow === 'daily') {
            finalPrompt = handleDaoistDailyChoice(text);
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

// 后端函数：获取系统指令 (同步)
const getSystemInstruction = (intimacy: IntimacyLevel, userName: string, flow: Flow): string => {
    let instruction = `你是${character.persona.name}，${character.persona.description}
    你的语言和行为必须严格遵守以下规则：
    - 核心人设: ${character.persona.description}
    - 亲密度规则: ${character.persona.intimacyRules}
    - 当前用户信息:
      - 用户昵称：${userName}
      - 你们的亲密度等级：${intimacy.level} (${intimacy.name})
      - 亲密度进度：${intimacy.progress}%
    - 特殊能力指令: 你可以通过输出特定格式的文本来调用特殊能力: ${character.persona.specialAbilities.join(', ')}。
    - 图片处理: 当用户发送图片时，你需要能识别、评论图片内容。
    `;

    instruction += "\n\n---";
    switch (flow) {
        case 'guidance':
            instruction += `\n**当前模式：仙人指路**\n用户正在向你寻求指引。你必须严格遵循以下JSON中定义的“三步对话模式”来与用户互动。绝不能跳过任何步骤，也不能一次性回答所有问题。
            \`\`\`json
            ${JSON.stringify(character.guidanceFlows, null, 2)}
            \`\`\`
            流程：1. 根据用户意图，从'message'字段中选择并仅回复对应话术索取信息。 2. 收到信息后，回复对应的'ACKNOWLEDGE_INFO'话术作为过渡。 3. 最后，根据用户的输入，遵循'generation_rules'生成并交付最终结果，结果必须用 \`[DIVINATION]{...}\` 格式包裹。`;
            break;
        case 'game':
            instruction += `\n**当前模式：游戏小摊**\n${character.gameRules.introduction}
            ### 游戏规则文档 ###
            **你说我画:** ${character.gameRules.games['你说我画']}
            **故事接龙:** ${character.gameRules.games['故事接龙']}
            **真心话大冒险:** ${character.gameRules.games['真心话大冒险']}`;
            break;
        case 'news':
            instruction += `\n**当前模式：俗世趣闻**\n${character.newsTopic.introduction}`;
            break;
        case 'daily':
            instruction += `\n**当前模式：道仙日常**\n${character.dailyTopic.introduction}`;
            break;
        default:
            instruction += "\n**当前模式：闲聊**\n这是你们的默认相处模式。自由发挥，根据用户的话题进行回应，自然地展现你的性格和能力。";
            break;
    }
    return instruction;
};

// 后端函数：转换消息格式 (同步)
const convertToApiMessages = (history: Message[], systemInstruction: string, text: string, imageBase64: string | null) => {
    const apiMessages: any[] = [{ role: 'system', parts: [{ text: systemInstruction }] }];
    for (const msg of history) {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        const parts: any[] = [];
        if (msg.text) { parts.push({ text: msg.text }); }
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
      currentUserParts.push({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg', 
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

    try {
        const {
            userId,
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
            res.write(JSON.stringify(chunk) + '\n');
        }

        res.end();

    } catch (error) {
        console.error('API handler error:', error);
        if (res.writableEnded) {
          console.error("Response already sent, cannot send error.");
          return;
        }
        res.status(500).json({ error: '后端服务处理失败' });
    }
}
