import React from 'react';
import { DiceResult } from '../types';

interface DiceDisplayProps {
  result: DiceResult;
}

const DiceDisplay: React.FC<DiceDisplayProps> = ({ result }) => {
  return (
    <div className="border border-white/10 bg-black/20 rounded-lg p-4 mb-3 shadow-inner">
      <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">天机骰</p>
      <div className="flex items-center flex-wrap gap-2 my-2">
        {result.values.map((value, index) => (
          <div key={index} className="w-10 h-10 bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg rounded">
            {value}
          </div>
        ))}
        {result.modifier != null && (
          <>
            <span className="text-2xl text-violet-300 font-light">{result.modifier >= 0 ? '+' : '-'}</span>
            <div className="w-10 h-10 bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg rounded">
              {Math.abs(result.modifier)}
            </div>
          </>
        )}
        <span className="text-2xl text-violet-300 font-light mx-1">=</span>
         <div className="w-12 h-12 bg-white border border-violet-200 flex items-center justify-center text-[var(--yaojin-bubble-color)] font-bold text-xl rounded shadow-lg">
            {result.total}
          </div>
      </div>
      <p className="text-xs text-white/60">骰子已掷，天命已定。</p>
    </div>
  );
};

export default DiceDisplay;