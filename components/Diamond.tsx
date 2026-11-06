

import React from 'react';

interface DiamondProps {
  bases: [boolean, boolean, boolean];
  onToggle: (baseIndex: 0 | 1 | 2) => void;
  className?: string;
  activeColor?: string;
  disableScale?: boolean;
}

export const Diamond: React.FC<DiamondProps> = ({ bases, onToggle, className = "", activeColor = "#facc15", disableScale = false }) => {
  // We use inline styles for the dynamic active color, falling back to yellow class logic if needed
  const getStyle = (active: boolean) => {
      if (!active) return {};
      return {
          backgroundColor: activeColor,
          boxShadow: `0 0 25px ${activeColor}`
      };
  };

  const baseClass = (active: boolean) => 
    `w-12 h-12 lg:w-16 lg:h-16 border-2 border-white transform-gpu rotate-45 transition-all duration-150 cursor-pointer shadow-lg ${active ? (disableScale ? '' : 'scale-110') : 'bg-white/10 hover:bg-white/30'}`;

  return (
    <div className={`relative w-[160px] h-[114px] lg:w-[224px] lg:h-[157px] ${className}`}>
      {/* 2nd Base (Top) */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 ${baseClass(bases[1])}`} 
        onClick={() => onToggle(1)}
        style={getStyle(bases[1])}
      />
      
      {/* 3rd Base (Left) */}
      <div 
        className={`absolute left-0 top-[80px] lg:top-[112px] -translate-y-1/2 ${baseClass(bases[2])}`} 
        onClick={() => onToggle(2)}
        style={getStyle(bases[2])}
      />

      {/* 1st Base (Right) */}
      <div 
        className={`absolute right-0 top-[80px] lg:top-[112px] -translate-y-1/2 ${baseClass(bases[0])}`} 
        onClick={() => onToggle(0)}
        style={getStyle(bases[0])}
      />
    </div>
  );
};