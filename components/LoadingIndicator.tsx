import React from 'react';

const LoadingIndicator: React.FC = () => (
  <div className="flex items-center gap-2">
    <span className="text-white/80">小道仙正在掐算...</span>
    <div className="flex space-x-1">
        <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
  </div>
);

export default LoadingIndicator;