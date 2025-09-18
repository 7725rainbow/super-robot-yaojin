import React, { useState, useRef, useEffect } from 'react';
import { User, IntimacyLevel, Flow } from '../types';
import { YAO_JIN_AVATAR } from '../constants';

interface HeaderProps {
  onClearHistory: () => void;
  onReturnToHome: () => void;
  activeFlow: Flow;
  currentUser: User | null;
  userAvatar: string | null;
  onAvatarChangeClick: () => void;
  onLoginClick: () => void;
  onLogout: () => void;
  intimacy: IntimacyLevel;
}

const Header: React.FC<HeaderProps> = ({
  onClearHistory,
  onReturnToHome,
  activeFlow,
  currentUser,
  userAvatar,
  onAvatarChangeClick,
  onLoginClick,
  onLogout,
  intimacy,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const handleMenuAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  const userMenu = (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-white/50 border-2 border-white overflow-hidden shadow-md flex items-center justify-center">
          {userAvatar ? (
            <img src={userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
          ) : (
             <img src="/default-user-avatar.png" alt="User Avatar" className="w-full h-full object-cover" />
          )}
        </div>
        <span className="text-white font-semibold hidden md:inline">{currentUser?.username}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-white/80 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-sm border border-white/20 rounded-md shadow-lg z-20 animate-fade-in-up">
          <div className="py-1">
            <button onClick={() => handleMenuAction(onAvatarChangeClick)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-violet-100">更换头像</button>
            <button onClick={() => handleMenuAction(onClearHistory)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-violet-100">清除记忆</button>
            <div className="border-t border-gray-200 my-1"></div>
            <button onClick={() => handleMenuAction(onLogout)} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-violet-100">退出</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="p-4 flex justify-between items-center shadow-md sticky top-0 z-10" style={{ backgroundColor: 'var(--nav-background-color)' }}>
      <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-full border-2 border-[var(--yaojin-bubble-color)] bg-white/50 flex items-center justify-center overflow-hidden">
      <img src={YAO_JIN_AVATAR} alt="尧金头像" className="h-full w-full object-cover" />
    </div>
        <div>
          <h1 className="text-xl font-bold text-white">尧金</h1>
          <div className="w-32 h-2.5 bg-black/20 rounded-full overflow-hidden mt-1.5 border border-white/30">
            <div 
              className="h-full bg-gradient-to-r from-violet-300 to-white rounded-full transition-all duration-500" 
              style={{ width: `${intimacy.progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {currentUser ? (
          <>
            {activeFlow !== 'default' && (
                 <button
                    onClick={onReturnToHome}
                    className="p-2 text-white/80 hover:text-white transition-colors flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-full px-3"
                    title="返回主界面"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium hidden sm:inline">返回</span>
                </button>
            )}
            {userMenu}
          </>
        ) : (
          <button onClick={onLoginClick} className="bg-white/90 hover:bg-white text-[var(--nav-background-color)] font-bold py-2 px-4 rounded-full transition-colors">
            登录/注册
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;