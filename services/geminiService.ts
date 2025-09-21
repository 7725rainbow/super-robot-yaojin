// services/geminiService.ts

import * as character from '../core/characterSheet.js';
import { Message, IntimacyLevel, Flow, DivinationResult, DiceResult, GroundingChunk } from '../types.js';
import { getDaoistDailyIntro, handleDaoistDailyChoice } from './daoistDailyService';

// 移除所有与GoogleGenerativeAI相关的导入
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Content } from '@google/generative-ai';

interface UserState {
    flow: keyof typeof character.guidanceFlows;
    step: number;
    userInputHistory: string[];
}
const userSessionStore: Record<string, UserState | null> = {};

// 移除所有直接调用API的函数，因为它们将由后端处理
// const API_BASE_URL = 'https://api.bltcy.ai/v1';
// const API_KEY = import.meta.env.VITE_API_KEY;

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

// 修改后的核心函数，它将请求发送到后端
export async function* handleUserMessage(
    userId: string,
    text: string,
    imageFile: File | null,
    history: Message[],
    intimacy: IntimacyLevel,
    userName: string,
    currentFlow: Flow
): AsyncGenerator<Partial<Message>> {
    
    // ... [以下逻辑保持不变] ...
    
    // (逻辑...省略... 这段代码在后端文件中)
    const userState = userSessionStore[userId];
    if (userState) { userSessionStore[userId] = null; }

    if (!userState && currentFlow === 'default') {
        const triageResult = await sendRequestToBackend('triage', { text, userName, intimacy });
        
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

// 这是一个新的辅助函数，用于将所有请求发送到后端
async function* sendMessageStream(
    text: string,
    imageFile: File | null,
    history: Message[],
    intimacy: IntimacyLevel,
    userName: string,
    flow: Flow
): AsyncGenerator<Partial<Message>> {
    try {
        let imageBase64 = null;
        if (imageFile) {
            imageBase64 = await fileToBase64(imageFile);
        }
        
        // 调用后端API，获取流式响应
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: 'some-user-id', // 确保你发送有效的 userId
                text,
                history,
                intimacy,
                userName,
                currentFlow: flow,
                imageBase64, // 发送图片base64到后端
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error('后端API请求失败或无响应体');
        }

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
                    if (dataStr === '[DONE]') break;
                    try {
                        const chunk = JSON.parse(dataStr);
                        if (chunk.text) {
                            accumulatedText += chunk.text;
                            yield { text: accumulatedText, isLoading: true };
                        } else if (chunk.divinationResult) {
                            // 处理特殊格式的数据块
                            yield { divinationResult: chunk.divinationResult, isLoading: false };
                        } // ... 可以添加更多处理特殊数据块的逻辑
                    } catch (e) { console.error('Failed to parse stream chunk:', dataStr, e); }
                }
            }
        }
        
        // 最终的响应处理（如果后端返回非流式数据）
        // 这里需要根据后端实际的返回格式来调整
        yield { text: accumulatedText, isLoading: false };

    } catch (error) {
        console.error("API error:", error);
        // ... (错误处理逻辑保持不变) ...
    }
}
