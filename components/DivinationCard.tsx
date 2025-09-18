import React from 'react';
import { DivinationResult } from '../types';

interface DivinationCardProps {
  result: DivinationResult;
}

const DivinationCard: React.FC<DivinationCardProps> = ({ result }) => {
  return (
    <div className="border border-white/10 bg-black/20 rounded-lg p-4 mb-3 shadow-inner">
      <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">{result.type}</p>
      <h4 className="text-xl font-bold text-white my-1">{result.name}</h4>
      <p className="text-sm text-violet-200 whitespace-pre-wrap">{result.description}</p>
    </div>
  );
};

export default DivinationCard;