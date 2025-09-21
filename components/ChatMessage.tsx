import React from 'react';
import { Message } from '../types';
import DivinationCard from './DivinationCard';
import DiceDisplay from './DiceDisplay';
import LoadingIndicator from './LoadingIndicator';
import { YAO_JIN_AVATAR } from '../constants';

interface ChatMessageProps {
  message: Message;
  userAvatar: string | null;
  isLastMessage: boolean;
  onQuickReply: (text: string) => void;
  onDeleteMessage: (id: string) => void;
}

const LinkifiedText: React.FC<{ text: string }> = ({ text }) => {
    const urlRegex = /((?:https?:\/\/|www\.)[^\s<>"'()]+)/g;

    return (
        <>
            {text.split('\n').map((line, lineIndex, linesArray) => (
                <React.Fragment key={lineIndex}>
                    {line.split(urlRegex).map((part, partIndex) => {
                        if (part.match(urlRegex)) {
                            const href = part.startsWith('http') ? part : `https://${part}`;
                            return (
                                <a key={partIndex} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                                    {part}
                                </a>
                            );
                        }
                        return part;
                    })}
                    {lineIndex < linesArray.length - 1 && <br />}
                </React.Fragment>
            ))}
        </>
    );
};

// Helper function to determine bubble style based on intimacy level
const getYaojinBubbleStyle = (level: number | undefined): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: 'var(--yaojin-bubble-color)',
    transition: 'background 0.5s ease, box-shadow 0.5s ease',
  };

  switch (level) {
    case 1:
      return baseStyle;
    case 2:
      return { ...baseStyle, background: 'linear-gradient(135deg, #5a4f9f, #4e4096)' };
    case 3:
      return { ...baseStyle, background: 'linear-gradient(135deg, #6b60b0, #4e4096)', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.15)' };
    case 4:
      return { ...baseStyle, background: 'linear-gradient(135deg, #7d6de0, #5445a6)', boxShadow: '0 0 8px rgba(236, 224, 255, 0.3)' };
    case 5:
      return { ...baseStyle, background: 'linear-gradient(135deg, #8a7ff2, #5445a6)' };
    default:
      return baseStyle;
  }
};


const ChatMessage: React.FC<ChatMessageProps> = ({ message, userAvatar, isLastMessage, onQuickReply, onDeleteMessage }) => {
  const isUser = message.sender === 'user';
  const intimacyLevel = message.intimacy?.level;

  const renderErrorMessage = () => {
    let errorText = '哎呀，本道仙的传讯术法出了点小岔-子，稍后再试吧。';
    switch (message.errorType) {
        case 'rate_limit':
            errorText = '道友，你问得太快，本道仙有点跟不上了。稍等片刻可好？';
            break;
        case 'safety':
            errorText = '这个问题...天机不可泄露，换个话题吧。';
            break;
    }
    return <p className="text-red-400 font-medium">{errorText}</p>;
  };

  const DeleteButton = () => (
    message.id !== '0' ? (
      <button
        onClick={() => onDeleteMessage(message.id)}
        title="删除"
        aria-label="删除消息"
        className="p-1 text-gray-400 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100 self-center flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    ) : <div className="w-6 flex-shrink-0"></div>
  );

  const bubbleStyle = !isUser ? getYaojinBubbleStyle(intimacyLevel) : {};

  const bubbleClasses = [
    'chat-bubble', // <-- [核心修改] 我在这里为您添加了这个固定的基础类名
    'px-4 py-3 rounded-xl shadow-md',
    isUser
      ? 'bg-[var(--user-bubble-color)] text-[var(--text-on-light)] rounded-br-none'
      : 'text-[var(--text-on-dark)] rounded-bl-none',
    (!isUser && intimacyLevel === 5) && 'animate-shimmer-glow'
  ].filter(Boolean).join(' ');


  return (
    <div className={`group flex items-start gap-3 my-4 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-white/50 flex-shrink-0 border-2 border-[var(--yaojin-bubble-color)] shadow-md flex items-center justify-center overflow-hidden">
            <img src={YAO_JIN_AVATAR} alt="尧金头像" className="h-full w-full object-cover" />
        </div>
      )}

      {isUser && <DeleteButton />}

      {/* [核心修改] 我从下面的 div 中移除了 max-w-xs 类 */}
      <div className={`flex flex-col flex-shrink-0 overflow-hidden ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={bubbleClasses}
          style={bubbleStyle}
        >
          {message.isLoading ? (
            <LoadingIndicator />
          ) : message.errorType ? (
            renderErrorMessage()
          ) : (
            <>
              {message.image && (
                <div className="mb-2 rounded-md overflow-hidden border border-black/10">
                    <img src={message.image} alt="uploaded content" className="max-w-xs" />
                </div>
              )}

              {message.generatedImageBase64 && (
                <div className="border border-white/20 bg-black/10 rounded-lg p-2 my-2 shadow-inner">
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">本道仙的大作</p>
                    <img 
                        src={`data:image/jpeg;base64,${message.generatedImageBase64}`} 
                        alt="AI generated art" 
                        className="rounded-md w-full max-w-sm"
                    />
                </div>
              )}
              
              {message.divinationResult && <DivinationCard result={message.divinationResult} />}
              {message.diceResult && <DiceDisplay result={message.diceResult} />}
              
              {message.text && (
                <div className={`text-base leading-relaxed break-words whitespace-pre-wrap`}>
                    <LinkifiedText text={message.text} />
                </div>
              )}

              {message.groundingChunks && message.groundingChunks.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/20 text-xs text-white/80">
                      <p className="font-bold mb-1">参考来源:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {message.groundingChunks.map((chunk, index) => (
                          chunk.web && chunk.web.uri && <li key={index}><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="hover:underline">{chunk.web.title || chunk.web.uri}</a></li>
                        ))}
                      </ul>
                  </div>
              )}
            </>
          )}
        </div>
        {isLastMessage && !isUser && message.quickReplies && message.quickReplies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
                {message.quickReplies.map((reply, index) => (
                    <button 
                        key={index} 
                        onClick={() => onQuickReply(reply)} 
                        className="bg-white/70 text-[var(--yaojin-bubble-color)] font-medium text-sm px-3 py-1.5 rounded-full border border-white hover:bg-white transition-colors shadow-sm backdrop-blur-sm"
                    >
                        {reply}
                    </button>
                ))}
            </div>
        )}
      </div>

      {!isUser && <DeleteButton />}

      {isUser && (
       <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 border-2 border-white overflow-hidden shadow-md flex items-center justify-center">
          {userAvatar ? (
              <img src={userAvatar} alt="你的头像" className="w-full h-full object-cover" />
          ) : (
              <img src="/default-user-avatar.png" alt="你的头像" className="w-full h-full object-cover" />
          )}
      </div>
      )}
    </div>
  );
};

export default ChatMessage;
