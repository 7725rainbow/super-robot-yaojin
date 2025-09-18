import React, { useState, useRef } from 'react';
import { login, register } from '../services/authService';
import { User } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onStartGuestSession: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess, onStartGuestSession }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    if (isLoginView) {
      const result = await login(email, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message);
      }
    } else {
        if (!username.trim()) {
            setError('用户名不能为空');
            setIsLoading(false);
            return;
        }
      const result = await register(username, email, password);
      if (result.success) {
        if (avatarPreview) {
            localStorage.setItem(`userAvatar_YaoJin_${email}`, JSON.stringify(avatarPreview));
        }
        setMessage('注册成功！现在可以登录了。');
        setIsLoginView(true);
        // Clear registration form fields
        setUsername('');
        setPassword('');
        setAvatarPreview(null);
      } else {
        setError(result.message);
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-up" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="关闭弹窗">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex justify-center mb-6">
            <button onClick={() => setIsLoginView(true)} className={`pb-2 text-xl font-bold transition-colors ${isLoginView ? 'text-gray-800 border-b-2 border-[var(--nav-background-color)]' : 'text-gray-400'}`}>登录</button>
            <span className="text-2xl text-gray-300 mx-4">|</span>
            <button onClick={() => setIsLoginView(false)} className={`pb-2 text-xl font-bold transition-colors ${!isLoginView ? 'text-gray-800 border-b-2 border-[var(--nav-background-color)]' : 'text-gray-400'}`}>注册</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {!isLoginView && (
            <div className="flex flex-col items-center mb-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-full bg-gray-200 border-2 border-dashed border-gray-400 hover:border-[var(--nav-background-color)] transition-all flex items-center justify-center overflow-hidden group"
                >
                    <img
                        src={avatarPreview || '/default-user-avatar.png'}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </button>
                <p className="text-sm text-gray-500 mt-2">设置一个头像，让尧金更好地认识你</p>
            </div>
          )}
          {!isLoginView && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                用户名
              </label>
              <input
                className="bg-gray-100 border border-gray-300 rounded w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--nav-background-color)] focus:border-[var(--nav-background-color)]"
                id="username"
                type="text"
                placeholder="你的称呼"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              邮箱
            </label>
            <input
              className="bg-gray-100 border border-gray-300 rounded w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--nav-background-color)] focus:border-[var(--nav-background-color)]"
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              密码
            </label>
            <div className="relative">
                <input
                    className="bg-gray-100 border border-gray-300 rounded w-full py-2 px-3 text-gray-800 pr-10 leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--nav-background-color)] focus:border-[var(--nav-background-color)]"
                    id="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    placeholder="******************"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                />
                <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={isPasswordVisible ? '隐藏密码' : '显示密码'}
                >
                    {isPasswordVisible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m0 0l-2.122 2.122" />
                    </svg>
                    ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                    </svg>
                    )}
                </button>
            </div>
          </div>
          
          {error && <p className="text-red-500 text-xs text-center mb-4">{error}</p>}
          {message && <p className="text-green-500 text-xs text-center mb-4">{message}</p>}

          <div className="flex items-center justify-between mt-4">
            <button
              className="bg-[var(--nav-background-color)] hover:opacity-90 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline w-full disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (isLoginView ? '登录中...' : '注册中...') : (isLoginView ? '登录' : '创建账户')}
            </button>
          </div>
        </form>
         <div className="text-center mt-4">
            <button
                type="button"
                onClick={onStartGuestSession}
                className="text-sm text-[var(--nav-background-color)] hover:opacity-80 hover:underline transition-colors"
            >
                开启临时会话
            </button>
         </div>
      </div>
    </div>
  );
};

export default AuthModal;