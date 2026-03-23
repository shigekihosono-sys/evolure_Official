
import React from 'react';
import { Bot } from 'lucide-react';

interface ChatFABProps {
  onClick: () => void;
}

export const ChatFAB: React.FC<ChatFABProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 bg-stone-900 text-white p-4 rounded-full shadow-xl hover:bg-black transition-all duration-300 z-50 group transform hover:scale-105 border border-stone-800"
    aria-label="AIコンシェルジュを開く"
    style={{ animation: 'pulse-stone 3s infinite' }}
  >
    <Bot size={28} strokeWidth={1.5} />
    <style>{`
        @keyframes pulse-stone {
            0% {
                box-shadow: 0 0 0 0 rgba(28, 25, 23, 0.4);
            }
            70% {
                box-shadow: 0 0 0 12px rgba(28, 25, 23, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(28, 25, 23, 0);
            }
        }
    `}</style>
  </button>
);
