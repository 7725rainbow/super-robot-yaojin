// Fix: Implement the main App component.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import Header from './components/Header';
import GuidePrompts from './components/GuidePrompts';
import AuthModal from './components/AuthModal';
import NotificationMessage from './components/NotificationMessage';
import ConfirmationModal from './components/ConfirmationModal';
import AvatarSelectionModal from './components/AvatarSelectionModal';
import { Message, IntimacyLevel, User, Flow } from './types';
import { sendMessageStream } from './services/geminiService';
import { getCurrentUser, logout } from './services/authService';

const INTIMACY_LEVELS = [
    { level: 1, name: '渡劫道友', min: 0 },
    { level: 2, name: '有缘人', min: 21 },
    { level: 3, name: '道仙常客', min: 41 },
    { level: 4, name: '道仙金主', min: 61 },
    { level: 5, name: '尧金的主人', min: 81 },
];

const GUEST_USER: User = { username: '临时道友', email: 'guest_session', isGuest: true };

const getIntimacyFromProgress = (progress: number): IntimacyLevel => {
    const currentLevel = INTIMACY_LEVELS.slice().reverse().find(l => progress >= l.min) || INTIMACY_LEVELS[0];
    return { ...currentLevel, progress: Math.min(progress, 100) };
};

const INITIAL_MESSAGE: Message = {
    id: '0',
    sender: 'bot',
    text: '世界是一场巨大的赌局，人人都想赢，但很少有人看得清牌面。我，尧金，勉强能看到几张。不过，天机......本道仙只说给有缘人听。',
};

const DEFAULT_USER_AVATAR = '/default-user-avatar.png';


const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCooldown, setIsCooldown] = useState(false);
    const [cooldownDuration, setCooldownDuration] = useState(2000);
    const cooldownTimeoutRef = useRef<number | null>(null);
    const [userAvatar, setUserAvatar] = useState<string | null>(DEFAULT_USER_AVATAR);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [intimacyProgress, setIntimacyProgress] = useState(0);
    const [activeFlow, setActiveFlow] = useState<Flow>('default');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const currentIntimacy = getIntimacyFromProgress(intimacyProgress);
    const userName = currentUser?.username || '道友';

    // On initial mount, check if there's a logged-in user session
    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    // Cleanup timeout on component unmount
    useEffect(() => {
        return () => {
            if (cooldownTimeoutRef.current) {
                clearTimeout(cooldownTimeoutRef.current);
            }
        };
    }, []);


    // Load data from local storage whenever the current user changes (login, logout, guest)
    useEffect(() => {
        try {
            if (currentUser) {
                const userScope = currentUser.isGuest ? '_GUEST' : `_${currentUser.email}`;
                const savedMessages = localStorage.getItem(`chatHistory_YaoJin${userScope}`);
                const savedIntimacy = localStorage.getItem(`intimacy_YaoJin${userScope}`);
                const savedUserAvatar = localStorage.getItem(`userAvatar_YaoJin${userScope}`);

                setMessages(savedMessages ? JSON.parse(savedMessages) : [INITIAL_MESSAGE]);
                setIntimacyProgress(savedIntimacy ? JSON.parse(savedIntimacy) : 0);
                setUserAvatar(savedUserAvatar ? JSON.parse(savedUserAvatar) : DEFAULT_USER_AVATAR);
                setActiveFlow('default'); // Reset flow on user change
            } else {
                 // If no user, reset to initial state
                setMessages([INITIAL_MESSAGE]);
                setIntimacyProgress(0);
                setUserAvatar(DEFAULT_USER_AVATAR);
                setActiveFlow('default');
            }
        } catch (error) {
            console.error("Failed to load from local storage", error);
            setMessages([INITIAL_MESSAGE]);
        }
    }, [currentUser]);

    // Save data to local storage on data change, but only for the default flow
    useEffect(() => {
        try {
            if (currentUser && activeFlow === 'default') {
                 const userScope = currentUser.isGuest ? '_GUEST' : `_${currentUser.email}`;
                 const messagesToSave = messages.filter(m => m.sender !== 'notification');
                 if (messagesToSave.length > 0) {
                     localStorage.setItem(`chatHistory_YaoJin${userScope}`, JSON.stringify(messagesToSave));
                }
                localStorage.setItem(`intimacy_YaoJin${userScope}`, JSON.stringify(intimacyProgress));
                if (userAvatar) {
                    localStorage.setItem(`userAvatar_YaoJin${userScope}`, JSON.stringify(userAvatar));
                }
            }
        } catch (error) {
             console.error("Failed to save to local storage", error);
        }
    }, [messages, intimacyProgress, userAvatar, currentUser, activeFlow]);


    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // Effect to show intimacy level-up notification
    const prevIntimacyLevel = useRef(currentIntimacy.level);
    useEffect(() => {
        const newLevelData = getIntimacyFromProgress(intimacyProgress);
        if (newLevelData.level > prevIntimacyLevel.current && prevIntimacyLevel.current > 0) {
            const notificationMessage: Message = {
                id: `notification-${Date.now()}`,
                sender: 'notification',
                text: '',
                notificationContent: `与尧金的亲密度已提升至: ${newLevelData.level}级 - ${newLevelData.name}`,
            };
            setMessages(prev => [...prev, notificationMessage]);
        }
        prevIntimacyLevel.current = newLevelData.level;
    }, [intimacyProgress]);

    const handleSend = useCallback(async (text: string, imageFile: File | null) => {
        if (!currentUser) {
            setIsAuthModalOpen(true);
            return;
        }
        if ((!text.trim() && !imageFile) || isLoading || isCooldown) return;

        setIsLoading(true);

        let imageBase64Data: string | undefined;
        let imageMimeTypeData: string | undefined;
        let imagePreviewUrl: string | undefined;

        if (imageFile) {
            try {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    // FIX: Changed 'file' to 'imageFile' to correctly reference the function parameter.
                    reader.readAsDataURL(imageFile);
                });
                imagePreviewUrl = dataUrl;
                const parts = dataUrl.split(',');
                imageMimeTypeData = parts[0].match(/:(.*?);/)?.[1];
                imageBase64Data = parts[1];
            } catch (error) {
                console.error("Error reading image file:", error);
                setIsLoading(false);
                return;
            }
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: text,
            image: imagePreviewUrl,
            imageBase64: imageBase64Data,
            imageMimeType: imageMimeTypeData,
            intimacy: currentIntimacy,
        };

        const botMessage: Message = {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: '',
            isLoading: true,
            intimacy: currentIntimacy,
        };

        setMessages(prev => [...prev, userMessage, botMessage]);

        try {
            const history = messages.filter(m => m.id !== '0' && m.sender !== 'notification');
            const stream = sendMessageStream(text, imageFile, history, currentIntimacy, userName, activeFlow);

            let lastBotMessage: Message | null = null;
            let rateLimitErrorOccurred = false;

            for await (const partialBotMessage of stream) {
                lastBotMessage = { ...botMessage, ...partialBotMessage, isLoading: false };
                if (lastBotMessage.errorType === 'rate_limit') {
                    rateLimitErrorOccurred = true;
                }
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsgIndex = newMessages.findIndex(m => m.id === botMessage.id);
                    if (lastMsgIndex !== -1) {
                        newMessages[lastMsgIndex] = lastBotMessage;
                    }
                    return newMessages;
                });
            }

            if (lastBotMessage && !lastBotMessage.errorType) {
                 setIntimacyProgress(prev => Math.min(prev + Math.floor(Math.random() * 3) + 1, 100));
            }

            if (rateLimitErrorOccurred) {
                // On 429 error, increase cooldown up to 10s
                const newDuration = Math.min(cooldownDuration + 2000, 10000);
                setCooldownDuration(newDuration);
            } else if (cooldownDuration > 2000) {
                // On success, gradually decrease cooldown back to 2s
                const newDuration = Math.max(cooldownDuration - 1000, 2000);
                setCooldownDuration(newDuration);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: `bot-error-${Date.now()}`,
                sender: 'bot',
                text: '哎呀，本道仙的传讯术法出了点小岔子，稍后再试吧。',
                isLoading: false,
            };
            setMessages(prev => prev.map(m => m.id === botMessage.id ? errorMessage : m));
        } finally {
            setIsLoading(false);
            setIsCooldown(true);
            if (cooldownTimeoutRef.current) {
                clearTimeout(cooldownTimeoutRef.current);
            }
            cooldownTimeoutRef.current = window.setTimeout(() => {
                setIsCooldown(false);
            }, cooldownDuration);
        }
    }, [messages, isLoading, isCooldown, currentUser, intimacyProgress, userName, cooldownDuration, activeFlow]);
    
    const handlePromptClick = (intro: { text: string; replies: string[] }, flowId: Flow) => {
        setActiveFlow(flowId);
        const botMessage: Message = {
            id: `bot-flow-start-${Date.now()}`,
            sender: 'bot',
            text: intro.text,
            quickReplies: intro.replies,
        };
        // Start a temporary conversation for the flow
        setMessages([botMessage]);
    };

    const handleDeleteMessage = useCallback((id: string) => {
        if (window.confirm('确定要删除这条消息吗？')) {
            setMessages(prev => prev.filter(m => m.id !== id));
        }
    }, []);

    const handleNewConversation = () => {
        setIsNewConversationModalOpen(true);
    };

    const handleConfirmNewConversation = () => {
        // Load history to reset to the main conversation thread
        if(currentUser) {
            const userScope = currentUser.isGuest ? '_GUEST' : `_${currentUser.email}`;
            const savedMessages = localStorage.getItem(`chatHistory_YaoJin${userScope}`);
            setMessages(savedMessages ? JSON.parse(savedMessages) : [INITIAL_MESSAGE]);
        } else {
             setMessages([INITIAL_MESSAGE]);
        }
        setActiveFlow('default');
        setIsNewConversationModalOpen(false);
    };

    const handleClearHistory = () => {
        if (currentUser) {
            const userScope = currentUser.isGuest ? '_GUEST' : `_${currentUser.email}`;
            localStorage.removeItem(`chatHistory_YaoJin${userScope}`);
            localStorage.removeItem(`intimacy_YaoJin${userScope}`);
            localStorage.removeItem(`userAvatar_YaoJin${userScope}`);
        }
        setMessages([INITIAL_MESSAGE]);
        setIntimacyProgress(0);
        setUserAvatar(DEFAULT_USER_AVATAR);
        setActiveFlow('default');
        if(currentUser?.isGuest) {
            setCurrentUser(null);
        }
    };

    const handleAvatarChange = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUserAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);
        setIsAvatarModalOpen(false);
    };

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setIsAuthModalOpen(false);
    };

    const handleLogout = () => {
        logout();
        setCurrentUser(null);
    };

    const handleStartGuest = () => {
        setCurrentUser(GUEST_USER);
        setIsAuthModalOpen(false);
    };

    return (
        <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--chat-background-color)' }}>
            <Header
                intimacy={currentIntimacy}
                onClearHistory={handleClearHistory}
                onNewConversation={handleNewConversation}
                currentUser={currentUser}
                userAvatar={userAvatar}
                onAvatarChangeClick={() => setIsAvatarModalOpen(true)}
                onLoginClick={() => setIsAuthModalOpen(true)}
                onLogout={handleLogout}
            />
            <main className="flex-grow overflow-y-auto p-4" style={{ backgroundColor: 'var(--chat-background-color)' }}>
                <div className="max-w-4xl mx-auto">
                    
                    {messages.length > 0 && (
                        <div className="initial-message-animation">
                            <ChatMessage
                                key={messages[0].id}
                                message={messages[0]}
                                userAvatar={userAvatar}
                                isLastMessage={messages.length === 1}
                                onQuickReply={(text) => handleSend(text, null)}
                                onDeleteMessage={handleDeleteMessage}
                            />
                        </div>
                    )}

                    {activeFlow === 'default' && messages.length <= 1 && (
                        <div className="guide-prompts-animation">
                            <GuidePrompts onPromptClick={handlePromptClick} />
                        </div>
                    )}

                    {messages.slice(1).map((message, index) =>
                        message.sender === 'notification' ? (
                            <NotificationMessage key={message.id} message={message.notificationContent || ''} />
                        ) : (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                userAvatar={userAvatar}
                                isLastMessage={index === messages.slice(1).length - 1}
                                onQuickReply={(text) => handleSend(text, null)}
                                onDeleteMessage={handleDeleteMessage}
                            />
                        )
                    )}
                    
                    <div ref={chatEndRef} />
                </div>
            </main>
            <ChatInput onSend={handleSend} isLoading={isLoading || isCooldown} />
            {isAuthModalOpen && (
                <AuthModal
                    onClose={() => setIsAuthModalOpen(false)}
                    onLoginSuccess={handleLoginSuccess}
                    onStartGuestSession={handleStartGuest}
                />
            )}
            {isNewConversationModalOpen && (
                <ConfirmationModal
                    isOpen={isNewConversationModalOpen}
                    onClose={() => setIsNewConversationModalOpen(false)}
                    onConfirm={handleConfirmNewConversation}
                    title="结束当前对话？"
                    message="这将清除当前临时对话并返回主聊天记录。确定要继续吗？"
                />
            )}
            {isAvatarModalOpen && (
                <AvatarSelectionModal
                    isOpen={isAvatarModalOpen}
                    onClose={() => setIsAvatarModalOpen(false)}
                    onUpload={handleAvatarChange}
                    onSelectPreset={() => {}}
                />
            )}
        </div>
    );
};

export default App;
