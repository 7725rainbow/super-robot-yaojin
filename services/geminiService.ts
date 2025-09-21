// services/geminiService.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Content } from '@google/generative-ai';
import * as character from '../core/characterSheet.js';
import { Message, IntimacyLevel, Flow, DivinationResult, DiceResult, GroundingChunk } from '../types.js';
import { getDaoistDailyIntro, handleDaoistDailyChoice } from './daoistDailyService';

interface UserState {
  flow: keyof typeof character.guidanceFlows;
  step: number;
  userInputHistory: string[];
}
const userSessionStore: Record<string, UserState | null> = {};

const API_BASE_URL = 'https://api.bltcy.ai/v1';
const API_KEY = import.meta.env.VITE_API_KEY;

const fetchDoc = (url: string) => fetch(url).then(res => res.text());
const fetchJson = (url:string) => fetch(url).then(res => res.json());

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

const generateImageFromPrompt = async (prompt: string): Promise<string | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/images/generations`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'User-Agent': 'DMXAPI/1.0.0 ( https://api.bltcy.ai )', 'Content-Type': 'application/json' },
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

export async function* handleUserMessage(
  userId: string,
  text: string,
  imageFile: File | null,
  history: Message[],
  intimacy: IntimacyLevel,
  userName: string,
  currentFlow: Flow
): AsyncGenerator<Partial<Message>> {

  const userState = userSessionStore[userId];

  if (userState) {
    userSessionStore[userId] = null;
  }

  if (!userState && currentFlow === 'default') {
    const triageResult = await runTriage(text, userName, intimacy);
    
    if (triageResult.action !== 'CONTINUE_CHAT') {
      if (triageResult.action === 'EXECUTE_SPECIAL_ACTION' && triageResult.target_action === 'dice_roll_for_choice') {
        const roll = Math.floor(Math.random() * 6) + 1;
        const choice = (roll % 2 === 1) ? 'A' : 'B';
        const diceMessage = triageResult.ai_response + `\n\n[DICE]{"result": [${roll}], "sides": 6, "outcome": "结果为${roll}，是${roll % 2 === 1 ? '单数' : '双数'}。那就选 ${choice} 吧，天意如此，别再叽叽歪歪。"}`;
        yield { text: diceMessage, isLoading: false };
        return;
      }
      
      if (triageResult.action === 'ROUTE_TO_FLOW' && triageResult.target_flow) {
        userSessionStore[userId] = {
          flow: triageResult.target_flow as keyof typeof character.guidanceFlows,
          step: 1,
          userInputHistory: [text]
        };
      }

      yield { text: triageResult.ai_response, isLoading: false };
      return; 
    }
  }

  yield* sendMessageStream(text, imageFile, history, intimacy, userName, currentFlow);
}

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
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); 
    const result = await model.generateContent(triagePrompt);
    const responseText = result.response.text().trim();
    
    try {
        const triageAction = JSON.parse(responseText);
        return triageAction;
    } catch (e) {
        return { action: 'CONTINUE_CHAT' };
    }
}

async function* sendMessageStream(
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

        if (flow === 'news') {
            if (text.includes('新鲜事')) {
                systemInstruction += `\n${character.newsTopic.subTopics['新鲜事']}`;
                const newsData = await getWeiboNewsFromBackend();
                if (newsData && newsData.length > 0) {
                    const formattedTrends = newsData.map((item, index) => `[${index + 1}] ${item.title}`).join('\n');
                    externalContext = `以下是微博热搜榜的新鲜事：\n\n${formattedTrends}`;
                }
            } 
            else if (text.includes('上映新片')) {
                systemInstruction += `\n${character.newsTopic.subTopics['上映新片']}`;
                const movieData = await getDoubanMoviesFromBackend();
                if (movieData && movieData.length > 0) {
                    const formattedMovies = movieData.map((movie, index) => `[${index + 1}] 《${movie.title}》- 评分: ${movie.score} (链接: ${movie.url})`).join('\n');
                    externalContext = `本道仙刚瞅了一眼，最近上映的电影倒是有点意思，这几部你看过吗？\n\n${formattedMovies}`;
                }
            } 
            else if (text.includes('小道仙的幻想')) {
                systemInstruction += `\n${character.newsTopic.subTopics['小道仙的幻想']}`;
            }
        }
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
            systemInstruction += `\n\n**请你基于以下外部参考资料，与用户展开对话**:\n${externalContext}`;
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
            body: JSON.stringify({ model: 'gemini-2.5-flash', messages: apiMessages, stream: true }),
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

const getSystemInstruction = async (intimacy: IntimacyLevel, userName: string, flow: Flow): Promise<string> => {
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