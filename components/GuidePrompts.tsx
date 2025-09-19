import React from 'react';
import { Flow } from '../types';

const prompts = [
  {
    id: 'news' as Flow,
    title: '俗世趣闻',
    description: '最近有什么新鲜事？想聊聊社会热点、明星八卦，还是拼好饭的中毒幻想？赶紧凑过来，和本道仙唠一唠。',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--nav-background-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-1-4h1" />
        </svg>
    ),
    intro: {
      text: '哼，想听什么？',
      replies: ['新鲜事', '上映新片', '小道仙的幻想']
    }
  },
  {
    id: 'guidance' as Flow,
    title: '仙人指路',
    description: '无论是五行占卜，还是星座塔罗，小道仙皆手到擒来。你只管开口, 本道仙自会替你拨云见日、扫清迷雾。',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--nav-background-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    intro: {
      text: '罢了，想算些什么？本道仙今天心情好，就勉为其难地指点你一下。',
      replies: ['今日运势', '塔罗启示', '正缘桃花', '事业罗盘']
    }
  },
  {
    id: 'daily' as Flow,
    title: '道仙日常',
    description: '别盯着本道仙发呆了。既然你这么闲得慌，本道仙就勉为其难，让你多了解我一点好了。想知道什么？',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--nav-background-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    ),
     intro: {
      text: '哼，别盯着本道仙发呆了。既然你这么闲得慌，本道仙就勉为其难，让你多了解我一点好了。想知道什么？',
      replies: ['最近看了...', '随便聊聊…', '我的记仇小本本', '最近买了...']
    }
  },
  {
    id: 'game' as Flow,
    title: '游戏小摊',
    description: '还觉得无聊？行吧，本道仙就屈尊降贵，陪你玩两把好了！输了可别哭鼻子。',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--nav-background-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    ),
    intro: {
      text: '想玩游戏？哼，你可未必是本道仙的对手。想玩什么？',
      replies: ['故事接龙', '真心话大冒险', '你说我画']
    }
  }
];

interface IntroData {
  text: string;
  replies: string[];
}

interface GuidePromptsProps {
  onPromptClick: (intro: IntroData, flowId: Flow) => void;
}

const GuidePrompts: React.FC<GuidePromptsProps> = ({ onPromptClick }) => {
  return (
    <div className="text-center my-8 animate-fade-in-up">
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="group flex items-center bg-white/60 p-4 rounded-lg border border-white/50 hover:border-white hover:bg-white/80 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 shadow-md hover:shadow-lg backdrop-blur-sm"
            onClick={() => onPromptClick(prompt.intro, prompt.id)}
          >
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 bg-white/50 rounded-lg mr-5 border border-white/30 group-hover:bg-white transition-all duration-300">
                {prompt.icon}
            </div>
            <div className="text-left">
                <h3 className="text-lg font-semibold text-[var(--yaojin-bubble-color)] group-hover:text-[var(--nav-background-color)] transition-colors duration-300">{prompt.title}</h3>
                <p className="text-[var(--yaojin-bubble-color)]/70 text-xs mt-1">{prompt.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuidePrompts;
