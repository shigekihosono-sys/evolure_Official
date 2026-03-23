
import React, { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <div className="relative inline-block align-middle group">
      {children}
      <div className="absolute bottom-full mb-2 w-max max-w-xs p-3 bg-white text-slate-800 text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-slate-200 text-left">
        {content}
      </div>
    </div>
  );
};