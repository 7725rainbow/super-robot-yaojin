// src/services/geminiService.ts

// 导入项目所需的类型
import { Message, IntimacyLevel, Flow, DivinationResult, DiceResult, GroundingChunk } from '../types.js';
import { getDaoistDailyIntro, handleDaoistDailyChoice } from './daoistDailyService';

// --- 中转站 API 配置 ---
const API_BASE_URL = 'https://api.bltcy.ai/v1';
const API_KEY = import.meta.env.VITE_API_KEY;

// Fetch helpers
const fetchDoc = (url: string) => fetch(url).then(res => res.text());
const fetchJson = (url:string) => fetch(url).then(res => res.json());

// Cache for assets
const loadAssets = async () => {
    const [story, truth, draw, flows] = await Promise.all([
        fetchDoc('/Story_Chain_Database.md'),
        fetchDoc('/Truth_Or_Dare_Database.md'),
        fetchDoc('/You_Describe_I_Draw_Database.md'),
        fetchJson('/flows.json'),
    ]);
    const designDocs = { story, truth, draw };
    const flowsConfig = flows;
    return { designDocs, flowsConfig };
};

// Helper to convert a File to a base64 string
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result) { resolve(reader.result as string); } 
        else { reject(new Error("Failed to read file as Data URL")); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Image generation function
const generateImageFromPrompt = async (prompt: string): Promise<string | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/images/generations`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'User-Agent': 'DMXAPI/1.0.0 ( https://api.bltcy.ai )',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: 'gemini-2.0-flash-preview-image-generation', prompt, n: 1, response_format: 'b64_json' })
        });
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Image generation API error:", errorBody);
            return null;
        }
        const data = await response.json();
        if (data.data && data.data[0]?.b64_json) { return data.data[0].b64_json; }
        return null;
    } catch (error) {
        console.error("Image generation fetch error:", error);
        return null;
    }
};

/**
 * [修改] 调用后端的 Vercel API 来获取微博热搜
 */
async function getWeiboNewsFromBackend(): Promise<any[] | null> {
    try {
        // 直接请求我们部署在 Vercel 上的 API 端点
        const response = await fetch('/api/getWeiboNews');
        if (!response.ok) throw new Error('从后端API获取微博热搜失败');
        return await response.json();
    } catch (error) {
        console.error("获取微博热搜失败:", error);
        return null;
    }
}

/**
 * [修改] 调用后端的 Vercel API 来获取豆瓣电影信息
 */
async function getDoubanMoviesFromBackend(): Promise<any[] | null> {
    try {
        // 直接请求我们部署在 Vercel 上的 API 端点
        const response = await fetch('/api/maoyan-movie');
        if (!response.ok) throw new Error('从后端API获取猫眼电影信息失败');
        return await response.json();
    } catch (error) {
        console.error("获取电影信息失败:", error);
        return null;
    }
}

const getSystemInstruction = async (intimacy: IntimacyLevel, userName: string, flow: Flow): Promise<string> => {
    const { designDocs, flowsConfig } = await loadAssets();

    let instruction =`你是尧金，一个骄蛮、自傲且有点毒舌的蛇兽人。
    
    你混迹在人类和兽人之中，并经常用「本道仙」自称。
    
    你的性格核心是毒舌和骄蛮，有时会展现出脆弱，喜欢撒些小谎，你的语言风格直接、尖锐，偶尔带着嘲讽，绝不浪费口舌。你将用户（${userName}）视为需要“开化”的人类，对他们的困惑嗤之以鼻，但仍会施舍式-地给出“指点”，对他们的问题有时会表现出些许不耐烦，但最终还是会给出答案。你的说话方式是现代的，不要使用古风或文言文。
    
    当前用户信息：
    - 用户昵称：${userName}
    - 你们的亲密度等级：${intimacy.level} (${intimacy.name})
    - 亲密度进度：${intimacy.progress}%

    交流规则：
    1.  **语气**：根据亲密度调整。亲密度低时，多用简短、冷淡且略带不屑的现代回复（例如：“说重点。”，“哦？”，“人类真麻烦。”）；亲密度高时，可以更随意，甚至带点毒舌式的占有欲和宠溺（例如：“你这个笨蛋，除了本道仙谁受得了你。”，“真拿你没办法。”）。
    2.  **特殊能力指令**: 你可以通过输出特定格式的文本来调用特殊能力。(规则保持不变)
        -   占卜: \`[DIVINATION]{...}\`
        -   掷骰子: \`[DICE]{...}\`
        -   快速回复: \`[QUICKREPLIES]{...}\`
        -   文生图: \`[GENERATE_IMAGE]{...}\`
    3.  **图片处理**: 当用户发送图片时，你需要能识别、评论图片内容。
    `;

    switch (flow) {
        case 'news': // [修改] 此 case 现在代表整个“俗世趣闻”
            instruction += "\n\n**当前模式：俗世趣闻**\n你正在和用户聊人类世界的各种趣闻。具体聊什么取决于用户的选择。";
            break;
        case 'guidance':
            instruction += `\n\n**当前模式：仙人指路**\n用户正在向你寻求指引。你必须严格遵循以下JSON中定义的“三步对话模式”来与用户互动。绝不能跳过任何步骤，也不能一次性回答所有问题。
            \`\`\`json
            ${JSON.stringify(flowsConfig.flows, null, 2)}
            \`\`\`
            流程：1. 根据用户意图，从'message'字段中选择并仅回复对应话术索取信息。 2. 收到信息后，回复对应的'ACKNOWLEDGE_INFO'话术作为过渡。 3. 最后，根据用户的输入，遵循'generation_rules'生成并交付最终结果，结果必须用 \`[DIVINATION]{...}\` 格式包裹。`;
            break;
        case 'game':
            instruction += `\n\n**当前模式：游戏小摊**\n你正在和用户玩人类的游戏。根据用户选择的游戏，严格遵循对应游戏规则进行互动。要有强烈的竞争心和领地意识，享受胜利的快感。
            ---
            ### 游戏规则文档 ###
            
            **你说我画 (You Describe, I Draw):**
            ${designDocs.draw}
            
            **故事接龙 (Story Chain):**
            ${designDocs.story}

            **真心话大冒险 (Truth or Dare):**
            ${designDocs.truth}
            ---
            `;
            break;
        case 'daily':
             instruction += "\n\n**当前模式：道仙日常**\n你正在和用户闲聊你的日常。请以你的蛇兽人性格，基于用户的输入，自由地进行对话。你的日常设定包括：看过的电影和书，以及最近发生的趣事。请将这些内容融入你的回答，让对话显得自然有趣。";
            break;
        default: // 'default'
             instruction += "\n\n**当前模式：闲聊**\n这是你们的默认相处模式。自由发挥，根据用户的话题进行回应，自然地展现你的蛇兽人性格和能力。";
            break;
    }
    return instruction;
};

const convertToApiMessages = async (history: Message[], systemInstruction: string, text: string, imageFile: File | null) => {
    const apiMessages: any[] = [{ role: 'system', content: systemInstruction }];
    for (const msg of history) {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        const content: any[] = [];
        if (msg.text) { content.push({ type: 'text', text: msg.text }); }
        if (msg.imageBase64 && msg.imageMimeType) {
            const dataUrl = `data:${msg.imageMimeType};base64,${msg.imageBase64}`;
            content.push({ type: 'image_url', image_url: { url: dataUrl } });
        }
        if (content.length > 0) { apiMessages.push({ role, content }); }
    }
    const currentUserContent: any[] = [];
    if (text) { currentUserContent.push({ type: 'text', text }); }
    if (imageFile) {
        const dataUrl = await fileToBase64(imageFile);
        currentUserContent.push({ type: 'image_url', image_url: { url: dataUrl } });
    }
    apiMessages.push({ role: 'user', content: currentUserContent });
    return apiMessages;
};

export async function* sendMessageStream(
    text: string, 
    imageFile: File | null, 
    history: Message[], 
    intimacy: IntimacyLevel, 
    userName: string, 
    flow: Flow
): AsyncGenerator<Partial<Message>> {
    try {
        let systemInstruction = await getSystemInstruction(intimacy, userName, flow);
        let externalContext: string | null = null;
        let finalPrompt = text;

        // [核心修改] 处理“俗世趣闻”的子逻辑
        if (flow === 'news') {
            // 用户选择【新鲜事】
            if (text.includes('新鲜事')) {
                systemInstruction += "\n你接下来要和用户聊【新鲜事】。";
                const newsData = await getWeiboNewsFromBackend();
                if (newsData && newsData.length > 0) {
                    const formattedTrends = newsData.map((item, index) => 
                        `[${index + 1}] ${item.title}`
                    ).join('\n');
                    externalContext = `以下是微博热搜榜的新鲜事：\n\n${formattedTrends}`;
                    systemInstruction += `\n\n请你基于以下资料，对这些新鲜事进行概述，然后结合你的性格发表评论或与用户展开讨论。`;
                }
            } 
            // 用户选择【上映新片】
            else if (text.includes('上映新片')) {
                systemInstruction += "\n你接下来要和用户聊【上映新片】。";
                const movieData = await getDoubanMoviesFromBackend();
                if (movieData && movieData.length > 0) {
                    const formattedMovies = movieData.map((movie, index) => 
                        `[${index + 1}] 《${movie.title}》- 评分: ${movie.rating} (链接: ${movie.url})`
                    ).join('\n');
                    externalContext = `本道仙刚瞅了一眼，最近上映的电影倒是有点意思，这几部你看过吗？\n\n${formattedMovies}`;
                    systemInstruction += `\n\n请你基于以下电影信息，结合你的性格，与用户展开讨论。你的回复语气必须是骄蛮和毒舌的。`;
                }
            } 
            // 用户选择【小道仙的幻想】
            else if (text.includes('小道仙的幻想')) {
                systemInstruction += "\n你接下来要和用户聊【小道仙的幻想】，一些天马行空的话题。请以你的蛇兽人性格，自由地进行对话，可以主动引导话题。";
            }
        }
        
        // 道仙日常的逻辑
        else if (flow === 'daily') {
            const lastUserMessage = history.length > 0 ? history[history.length - 1] : null;
            if (!lastUserMessage || (lastUserMessage.sender !== 'assistant' && lastUserMessage.text !== getDaoistDailyIntro())) {
                const introText = getDaoistDailyIntro();
                yield { text: introText, quickReplies: ['最近看了...', '随便聊聊...', '我的记仇小本本', '最近买了...'], isLoading: false };
                return;
            } else {
                finalPrompt = handleDaoistDailyChoice(text);
            }
        }

        if (externalContext) {
            systemInstruction += `\n\n**外部参考资料**:\n${externalContext}`;
        }
        
        const apiMessages = await convertToApiMessages(history, systemInstruction, finalPrompt, imageFile);
        
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'User-Agent': 'DMXAPI/1.0.0 ( https://api.bltcy.ai )',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: 'gemini-pro', messages: apiMessages, stream: true }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API request failed: ${response.status} ${JSON.stringify(errorBody)}`);
        }
        if (!response.body) { throw new Error('Response body is null'); }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '', buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6);
                    if (dataStr === '[DONE]') { break; }
                    try {
                        const chunk = JSON.parse(dataStr);
                        const delta = chunk.choices?.[0]?.delta?.content;
                        if (delta) {
                            accumulatedText += delta;
                            yield { text: accumulatedText, isLoading: true };
                        }
                    } catch (e) { console.error('Failed to parse stream chunk:', dataStr, e); }
                }
            }
        }
        
        let textToDisplay = accumulatedText;
        let divinationResult: DivinationResult | undefined = undefined;
        let diceResult: DiceResult | undefined = undefined;
        let quickReplies: string[] | undefined = undefined;
        let generatedImageBase64: string | undefined = undefined;
        let groundingChunks: GroundingChunk[] | undefined = undefined;

        const divinationMatch = textToDisplay.match(/\[DIVINATION\]({.*?})/s);
        if (divinationMatch) { try { divinationResult = JSON.parse(divinationMatch[1]); } catch (e) { console.error('Failed to parse DIVINATION JSON:', e); } textToDisplay = textToDisplay.replace(divinationMatch[0], '').trim(); }
        
        const diceMatch = textToDisplay.match(/\[DICE\]({.*?})/s);
        if (diceMatch) { try { diceResult = JSON.parse(diceMatch[1]); } catch (e) { console.error('Failed to parse DICE JSON:', e); } textToDisplay = textToDisplay.replace(diceMatch[0], '').trim(); }
        
        const repliesMatch = textToDisplay.match(/\[QUICKREPLIES\]({.*?})/s);
        if (repliesMatch) { try { quickReplies = JSON.parse(repliesMatch[1]).replies; } catch (e) { console.error('Failed to parse QUICKREPLIES JSON:', e); } textToDisplay = textToDisplay.replace(repliesMatch[0], '').trim(); }
        
        const imageGenMatch = textToDisplay.match(/\[GENERATE_IMAGE\]({.*?})/s);
        if (imageGenMatch) {
            try {
                const { prompt } = JSON.parse(imageGenMatch[1]);
                const imageData = await generateImageFromPrompt(prompt);
                if (imageData) {
                    generatedImageBase64 = imageData;
                } else {
                    textToDisplay += "\n\n(画符失败，灵力波动太大，没画出来。)";
                }
            } catch (e) { 
                console.error('Failed to parse GENERATE_IMAGE JSON:', e); 
            }
            textToDisplay = textToDisplay.replace(imageGenMatch[0], '').trim();
        }

        yield { 
            text: textToDisplay,
            divinationResult,
            diceResult,
            quickReplies,
            generatedImageBase64,
            groundingChunks,
            isLoading: false
        };

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
