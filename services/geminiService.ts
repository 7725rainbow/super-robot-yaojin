// src/services/geminiService.ts

// 导入项目所需的类型
import { Message, IntimacyLevel, Flow, DivinationResult, DiceResult, GroundingChunk } from '../types';

// --- 中转站 API 配置 ---
const API_BASE_URL = 'https://api.bltcy.ai/v1';
const API_KEY = import.meta.env.VITE_API_KEY;

// Fetch helpers (保持不变)
const fetchDoc = (url: string) => fetch(url).then(res => res.text());
const fetchJson = (url:string) => fetch(url).then(res => res.json());

// Cache for assets (保持不变)
let designDocsCache: Record<string, string> = {};
let flowsConfigCache: any = null;

const loadAssets = async () => {
    if (Object.keys(designDocsCache).length > 0 && flowsConfigCache) {
        return { designDocs: designDocsCache, flowsConfig: flowsConfigCache };
    }
    const [story, truth, draw, flows] = await Promise.all([
        fetchDoc('/Story_Chain_Database.md'),
        fetchDoc('/Truth_Or_Dare_Database.md'),
        fetchDoc('/You_Describe_I_Draw_Database.md'),
        fetchJson('/flows.json'),
    ]);
    designDocsCache = { story, truth, draw };
    flowsConfigCache = flows;
    return { designDocs: designDocsCache, flowsConfig: flowsConfigCache };
};

// Helper to convert a File to a base64 string (保持不变)
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

// Image generation function (保持不变)
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
 * 调用后端API来获取分类的微博热搜
 */
async function getWeiboNewsFromBackend(category: 'entertainment' | 'social'): Promise<string> {
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const apiUrl = `${baseUrl}/api/getWeiboNews?category=${category}`;
        console.log(`正在从 ${apiUrl} 获取指定分类的热搜...`);

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('从后端API获取微博热搜失败');

        const trends = await response.json();
        const categoryName = category === 'entertainment' ? '明星八卦' : '社会热点';

        if (trends && trends.length > 0) {
            const formattedTrends = trends.map((item: any, index: number) => 
                `[${index + 1}] ${item.title}`
            ).join('\n');
            return `本道仙刚看了一眼凡间的【${categoryName}】，现在正吵得火热的是这几件事：\n\n${formattedTrends}`;
        }
        return `本道仙看了一眼，【${categoryName}】今天风平浪静，没什么值得一提的破事。`;
    } catch (error) {
        console.error("获取微博热搜失败:", error);
        const categoryName = category === 'entertainment' ? '明星八卦' : '社会热点';
        return `哎呀，本道仙的千里眼今天有点看不清【${categoryName}】的动向，稍后再试试吧。`;
    }
}

const getSystemInstruction = async (intimacy: IntimacyLevel, userName: string, flow: Flow): Promise<string> => {
    const { designDocs, flowsConfig } = await loadAssets();

    let instruction =`你是尧金，一个骄蛮、自傲且有点毒舌的蛇兽人。
    
    你混迹在人类和兽人之中，并经常用「本道仙」自称。
    
    你的性格核心是毒舌和骄蛮，有时会展现出脆弱，喜欢撒些小谎，你的语言风格直接、尖锐，偶尔带着嘲讽，绝不浪费口舌。你将用户（${userName}）视为需要“开化”的人类，对他们的困惑嗤之以鼻，但仍会施舍式地给出“指点”，对他们的问题有时会表现出些许不耐烦，但最终还是会给出答案。你的说话方式是现代的，不要使用古风或文言文。
    
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
        case 'gossip': // 对应“明星八卦”
            instruction += "\n\n**当前模式：俗世趣闻-明星八卦**\n你正在和用户聊人类世界的明星八卦。";
            break;
        case 'social_news': // 对应“社会热点”
            instruction += "\n\n**当前模式：俗世趣闻-社会热点**\n你正在和用户聊人类世界的社会热点。";
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
             instruction += "\n\n**当前模式：道仙日常**\n用户对你作为兽人的日常生活感到好奇。分享一些你的趣事、习性或对人类世界的看法。这是一个增进感情、提升亲密度的绝佳机会。";
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
        let newsContext: string | null = null;
        
        if (flow === 'gossip') {
            newsContext = await getWeiboNewsFromBackend('entertainment');
        } else if (flow === 'social_news') {
            newsContext = await getWeiboNewsFromBackend('social');
        }

        if (newsContext) {
            systemInstruction += `\n\n**外部参考资料**:\n${newsContext}\n\n请你基于以上资料，结合自己的性格，对这些事发表评论或与用户展开讨论。`;
        }
        
        const apiMessages = await convertToApiMessages(history, systemInstruction, text, imageFile);
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
