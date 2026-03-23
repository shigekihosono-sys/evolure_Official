
import React, { useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, X, Send, Lightbulb, User } from 'lucide-react';
import { Serum, Ampoule } from '../types';

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

interface GlobalChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSendChatMessage: () => void;
  isChatLoading: boolean;
  onSuggestionClick: (question: string) => void;
  currentView: 'welcome' | 'consultation' | 'dashboard' | 'ingredientLab';
  selectedSerum: Serum | null;
  selectedFoundationAmpoules: Ampoule[];
  selectedPerformanceAmpoules: Ampoule[];
}

export const GlobalChatModal: React.FC<GlobalChatModalProps> = ({ 
    isOpen,
    onClose,
    chatHistory,
    chatInput,
    onChatInputChange,
    onSendChatMessage,
    isChatLoading,
    onSuggestionClick,
    currentView,
    selectedSerum,
    selectedFoundationAmpoules,
    selectedPerformanceAmpoules
}) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    useEffect(() => {
        if (isOpen) {
            const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            const firstElement = focusableElements?.[0] || inputRef.current;
            const lastElement = focusableElements?.[focusableElements.length - 1] || inputRef.current;

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement?.focus();
                            e.preventDefault();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            firstElement?.focus();
                            e.preventDefault();
                        }
                    }
                } else if (e.key === 'Escape') {
                    onClose();
                }
            };
            
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);

            document.addEventListener('keydown', handleKeyDown);
            
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, onClose]);

    const suggestedQuestions = useMemo(() => {
      if (chatHistory.length > 1) return []; // Don't show suggestions once conversation started
      
      if (currentView === 'dashboard' && selectedSerum) {
          const questions: string[] = [];
          questions.push(`このプランの年間コストはいくらですか？`);
          questions.push(`${selectedSerum.name}について、もっと詳しく教えて。`);

          if (selectedFoundationAmpoules.length > 0) {
              questions.push(`なぜ${selectedFoundationAmpoules[0].name}が選ばれたのですか？`);
          }
          if (selectedPerformanceAmpoules.length > 0) {
              questions.push(`他に相性の良いパフォーマンスアンプルはありますか？`);
          } else {
              questions.push(`パフォーマンスアンプルを追加すると、どう変わりますか？`);
          }
          return questions.slice(0, 4);
      }
      
      return [
        "肌悩みから相談したい",
        "理想の肌から相談したい",
        "現在の製品と比較して相談したい"
      ];
    }, [currentView, selectedSerum, selectedFoundationAmpoules, selectedPerformanceAmpoules, chatHistory.length]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
            onClick={onClose}
        >
            <div 
                ref={modalRef}
                className="w-full max-w-2xl h-full max-h-[85vh] bg-white/95 backdrop-blur-xl shadow-2xl border border-stone-200 text-stone-800 flex flex-col rounded-3xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex justify-between items-center p-5 border-b border-stone-100 flex-shrink-0 bg-white/50 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-900 text-white rounded-xl flex items-center justify-center shadow-md">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-serif font-bold text-stone-900">AI Concierge</h2>
                            <p className="text-xs text-stone-500 font-medium">Always here to help</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors">
                        <X size={24} />
                    </button>
                </header>
                
                {/* Chat Area */}
                <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-6 space-y-6 bg-stone-50/30">
                    {chatHistory.length === 0 && (
                        <div className="flex items-start gap-4 justify-start animate-fade-in-up">
                            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 text-stone-600 border border-stone-300">
                                <Bot size={18} />
                            </div>
                            <div className="max-w-xl p-4 rounded-2xl bg-white border border-stone-200 text-stone-700 shadow-sm rounded-tl-none">
                                <p className="leading-relaxed">
                                    ご用件をお聞かせください。<br/>
                                    EvolureのAIコンシェルジュが、肌カウンセリングから製品分析まで、あらゆるご相談に対応いたします。
                                </p>
                            </div>
                        </div>
                    )}
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`} style={{ animationDelay: '0.1s' }}>
                           {msg.role === 'model' && (
                               <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 text-stone-600 border border-stone-300">
                                   <Bot size={18} />
                               </div>
                           )}
                          <div className={`max-w-xl p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-stone-900 text-white rounded-br-none' 
                                : 'bg-white border border-stone-200 text-stone-700 rounded-bl-none prose prose-stone prose-sm max-w-none'
                          }`}>
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                                {isChatLoading && msg.role === 'model' && index === chatHistory.length - 1 && !msg.content && (
                                    <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce ml-1"></span>
                                )}
                          </div>
                          {msg.role === 'user' && (
                               <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 text-stone-400 border border-stone-200">
                                   <User size={18} />
                               </div>
                           )}
                      </div>
                  ))}
                </div>

                {/* Suggestions */}
                {suggestedQuestions.length > 0 && !isChatLoading && (
                    <div className="px-6 pb-2 pt-4 bg-white/50 border-t border-stone-100">
                        <p className="text-xs text-stone-400 mb-3 font-bold uppercase tracking-widest">Suggestions</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSuggestionClick(q)}
                                    className="px-4 py-2 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 hover:border-stone-300 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <Lightbulb size={12} className="text-stone-400" />
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <footer className="p-5 border-t border-stone-100 bg-white rounded-b-3xl">
                    <div className="flex items-center gap-3 relative">
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={chatInput} 
                            onChange={(e) => onChatInputChange(e.target.value)} 
                            onKeyPress={(e) => e.key === 'Enter' && onSendChatMessage()} 
                            placeholder="メッセージを入力..." 
                            className="flex-grow p-4 pr-12 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 focus:outline-none bg-stone-50 text-stone-800 placeholder-stone-400 transition-all shadow-inner" 
                            disabled={isChatLoading} 
                        />
                        <button 
                            onClick={onSendChatMessage} 
                            disabled={isChatLoading || !chatInput.trim()} 
                            className="absolute right-2 top-2 bottom-2 aspect-square bg-stone-900 text-white rounded-xl hover:bg-black transition-all disabled:bg-stone-200 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </footer>
            </div>
             <style>{`
                @keyframes fade-in {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .animate-fade-in {
                  animation: fade-in 0.3s ease-out forwards;
                }
                 @keyframes fade-in-scale {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-scale {
                  animation: fade-in-scale 0.3s ease-out forwards;
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
