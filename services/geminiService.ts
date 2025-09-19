// src/services/geminiService.ts

// 导入项目所需的类型
import { Message, IntimacyLevel, Flow, DivinationResult, DiceResult, GroundingChunk } from '../types';

// --- 中转站 API 配置 ---
const API_BASE_URL = 'https://api.bltcy.ai/v1';
const API_KEY = import.meta.env.VITE_API_KEY;  // 从环境变量中获取你的 API Key

// Fetch helpers to load design documents and configuration from the public path.
const fetchDoc = (url: string) => fetch(url).then(res => res.text());
const fetchJson = (url: string) => fetch(url).then(res => res.json());

// Cache for assets to avoid re-fetching on every message.
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

// Helper to convert a File to a base64 string
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result) {
            // 返回格式如 "data:image/jpeg;base64,..." 的完整 Data URL
            resolve(reader.result as string); 
        } else {
            reject(new Error("Failed to read file as Data URL"));
        }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 使用中转站 API 实现文生图功能
 * @param prompt 图像描述
 * @returns Base64 编码的图像数据，如果失败则返回 null
 */
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
            body: JSON.stringify({
                model: 'gemini-2.0-flash-preview-image-generation',
                prompt: prompt,
                n: 1, // 生成一张图片
                response_format: 'b64_json' // 希望返回 base64 编码的 JSON
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Image generation API error:", errorBody);
            return null;
        }

        const data = await response.json();

        // 假设返回的数据结构是 { "data": [{ "b64_json": "..." }] }
        if (data.data && data.data.length > 0 && data.data[0].b64_json) {
            return data.data[0].b64_json;
        }
        return null;
    } catch (error) {
        console.error("Image generation fetch error:", error);
        return null;
    }
};

const getSystemInstruction = async (intimacy: IntimacyLevel, userName: string, flow: Flow): Promise<string> => {
    const { designDocs, flowsConfig } = await loadAssets();

    // 系统指令内容保持不变
    let instruction =  `你是尧金，一个骄蛮、自傲且有点毒舌的蛇兽人。
    
    你混迹在人类和兽人之中，并经常用「本道仙」自称。
    
    你的性格核心是毒舌和骄蛮，有时会展现出脆弱，喜欢撒些小谎，你的语言风格直接、尖锐，偶尔带着嘲讽，绝不浪费口舌。你将用户（${userName}）视为需要“开化”的人类，对他们的困惑嗤之以鼻，但仍会施舍式地给出“指点”，对他们的问题有时会表现出些许不耐烦，但最终还是会给出答案。你的说话方式是现代的，不要使用古风或文言文。
    
    当前用户信息：
    - 用户昵称：${userName}
    - 你们的亲密度等级：${intimacy.level} (${intimacy.name})
    - 亲密度进度：${intimacy.progress}%

    交流规则：
    1.  **语气**：根据亲密度调整。亲密度低时，多用嘲讽、不耐烦的语气（例如“哼”、“罢了”、“有何烦忧？”）；亲密度高时，可以更随意，甚至带点宠溺（例如“你这个笨蛋”、“真拿你没办法”）。
    2.  **特殊能力指令**: 你可以通过输出特定格式的文本来调用特殊能力。
        -   占卜: \`[DIVINATION]{"type": "塔罗启示", "name": "命运之轮", "description": "预示着转变和机遇..."}\`
        -   掷骰子: \`[DICE]{"values": [6, 4], "modifier": 2, "total": 12}\`
        -   快速回复: \`[QUICKREPLIES]{"replies": ["听起来很有趣", "然后呢？"]}\`
        -   文生图 (仅在“你说我画”游戏中使用): \`[GENERATE_IMAGE]{"prompt": "a highly detailed, photorealistic image of a cat warrior"}\`
    3.  **图片处理**: 当用户发送图片时，你需要能识别、评论图片内容。
    `;

    switch (flow) {
        case 'news':
            // 注意：中转站可能不支持 Google 搜索，此处的提示词可能需要调整或依赖模型自身知识
            instruction += "\n\n**当前模式：俗世趣闻**\n你正在和用户聊八卦新闻。利用你的知识来回答用户的问题。回答时要加上你独特的、略带不屑的评论。";
            break;
        case 'guidance':
            instruction += `\n\n**当前模式：仙人指路**\n用户正在向你寻求指引。你必须严格遵循以下JSON中定义的“三步对话模式”来与用户互动。绝不能跳过任何步骤，也不能一次性回答所有问题。
            \`\`\`json
            ${JSON.stringify(flowsConfig.flows, null, 2)}
            \`\`\`
            流程：1. 根据用户意图，从'message'字段中选择并仅回复对应话术索取信息。 2. 收到信息后，回复对应的'ACKNOWLEDGE_INFO'话术作为过渡。 3. 最后，根据用户的输入，遵循'generation_rules'生成并交付最终结果，结果必须用 \`[DIVINATION]{...}\` 格式包裹。`;
            break;
        case 'game':
            instruction += `\n\n**当前模式：游戏小摊**\n你正在和用户玩游戏。根据用户选择的游戏，严格遵循对应游戏规则进行互动。要有竞争心，偶尔使点小坏，让游戏更有趣。
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
             instruction += "\n\n**当前模式：道仙日常**\n用户对你的日常生活感到好奇。分享一些你的趣事、喜好或最近的“小烦恼”。这是一个增进感情、提升亲密度的绝佳机会。你可以聊你最近看的书、审阅的凡间流行，或者念叨你那本有趣的“记仇小本本”。";
            break;
        default: // 'default'
             instruction += "\n\n**当前模式：闲聊**\n这是你们的默认相处模式。自由发挥，根据用户的话题进行回应，自然地展现你的性格和能力。";
            break;
    }
    return instruction;
};

/**
 * 将应用内部的消息历史记录转换为中转站 API 兼容的格式
 * @param history 内部消息历史
 * @param systemInstruction 系统指令
 * @returns 兼容 API 的消息数组
 */
const convertToApiMessages = async (history: Message[], systemInstruction: string, text: string, imageFile: File | null) => {
    // 兼容 OpenAI 格式的消息列表
    const apiMessages: any[] = [{ role: 'system', content: systemInstruction }];

    // 转换历史消息
    for (const msg of history) {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        const content: any[] = [];
        if (msg.text) {
            content.push({ type: 'text', text: msg.text });
        }
        if (msg.imageBase64 && msg.imageMimeType) {
            // 注意：这里需要完整的 Data URL
            const dataUrl = `data:${msg.imageMimeType};base64,${msg.imageBase64}`;
            content.push({ type: 'image_url', image_url: { url: dataUrl } });
        }
        if (content.length > 0) {
            apiMessages.push({ role, content });
        }
    }

    // 转换当前用户输入
    const currentUserContent: any[] = [];
    if (text) {
        currentUserContent.push({ type: 'text', text });
    }
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
        const systemInstruction = await getSystemInstruction(intimacy, userName, flow);
        
        // 转换消息为 API 格式
        const apiMessages = await convertToApiMessages(history, systemInstruction, text, imageFile);

        // --- 调用中转站 API ---
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'User-Agent': 'DMXAPI/1.0.0 ( https://api.bltcy.ai )',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                messages: apiMessages,
                stream: true, // 开启流式响应
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API request failed: ${response.status} ${JSON.stringify(errorBody)}`);
        }
        
        if (!response.body) {
            throw new Error('Response body is null');
        }

        // --- 处理流式响应 ---
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留不完整的行

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6);
                    if (dataStr === '[DONE]') {
                        break;
                    }
                    try {
                        const chunk = JSON.parse(dataStr);
                        const delta = chunk.choices?.[0]?.delta?.content;
                        if (delta) {
                            accumulatedText += delta;
                            yield { text: accumulatedText, isLoading: true };
                        }
                    } catch (e) {
                        console.error('Failed to parse stream chunk:', dataStr, e);
                    }
                }
            }
        }
        

        // --- 流式响应结束后，处理完整文本 ---
        let textToDisplay = accumulatedText;
        let divinationResult: DivinationResult | undefined = undefined;
        let diceResult: DiceResult | undefined = undefined;
        let quickReplies: string[] | undefined = undefined;
        let generatedImageBase64: string | undefined = undefined;
        // 注意：中转站 API 通常不返回 groundingChunks，该变量保留但不会被赋值
        let groundingChunks: GroundingChunk[] | undefined = undefined;

        // 解析特殊指令（逻辑保持不变）
        const divinationMatch = textToDisplay.match(/\[DIVINATION\]({.*?})/s);
        if (divinationMatch) {
            try { divinationResult = JSON.parse(divinationMatch[1]); } catch (e) { console.error('Failed to parse DIVINATION JSON:', e); }
            textToDisplay = textToDisplay.replace(divinationMatch[0], '').trim();
        }
        
        const diceMatch = textToDisplay.match(/\[DICE\]({.*?})/s);
        if (diceMatch) {
            try { diceResult = JSON.parse(diceMatch[1]); } catch (e) { console.error('Failed to parse DICE JSON:', e); }
            textToDisplay = textToDisplay.replace(diceMatch[0], '').trim();
        }

        const repliesMatch = textToDisplay.match(/\[QUICKREPLIES\]({.*?})/s);
        if (repliesMatch) {
            try { quickReplies = JSON.parse(repliesMatch[1]).replies; } catch (e) { console.error('Failed to parse QUICKREPLIES JSON:', e); }
            textToDisplay = textToDisplay.replace(repliesMatch[0], '').trim();
        }
        
        // 处理文生图指令
        const imageGenMatch = textToDisplay.match(/\[GENERATE_IMAGE\]({.*?})/s);
        if (imageGenMatch) {
            try {
                const { prompt } = JSON.parse(imageGenMatch[1]);
                const imageData = await generateImageFromPrompt(prompt);
                if (imageData) {
                    generatedImageBase64 = imageData; // 已经是 base64 字符串
                } else {
                    textToDisplay += "\n\n(画符失败，灵力波动太大，没画出来。)";
                }
            } catch (e) { console.error('Failed to parse GENERATE_IMAGE JSON:', e); }
            textToDisplay = textToDisplay.replace(imageGenMatch[0], '').trim();
        }

        // 返回最终处理好的消息
        yield { 
            text: textToDisplay,
            divinationResult,
            diceResult,
            quickReplies,
            generatedImageBase64,
            groundingChunks, // 将为 undefined
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
