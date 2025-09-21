// services/geminiService.ts

// 仅导入前端所需的类型和工具函数
import * as character from '../core/characterSheet.js';
import { Message, IntimacyLevel, Flow, DivinationResult, DiceResult, GroundingChunk } from '../types.js';
import { getDaoistDailyIntro, handleDaoistDailyChoice } from './daoistDailyService';

// 移除所有后端API相关的代码
// const API_BASE_URL = 'https://api.bltcy.ai/v1';
// const API_KEY = import.meta.env.VITE_API_KEY;

// 这个函数是前端处理文件逻辑，需要保留
export const fileToBase64 = async (file: File): Promise<string> => {
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

// 这两个函数是调用你的后端API，也需要保留
export async function getWeiboNewsFromBackend(): Promise<any[] | null> {
    try {
        const response = await fetch('/api/getWeiboNews');
        if (!response.ok) throw new Error('Failed to fetch Weibo news from backend API');
        return await response.json();
    } catch (error) {
        console.error("Failed to get Weibo news:", error);
        return null;
    }
}

export async function getDoubanMoviesFromBackend(): Promise<any[] | null> {
    try {
        const response = await fetch('/api/douban-movie');
        if (!response.ok) throw new Error('Failed to fetch Douban movie info from backend API');
        return await response.json();
    } catch (error) {
        console.error("Failed to get movie info:", error);
        return null;
    }
}

// 移除所有与后端交互的逻辑和函数，只保留辅助函数
// 将核心逻辑移动到 App.tsx 中直接调用 /api/chat
// 这个文件将不再包含 handleUserMessage 等函数
