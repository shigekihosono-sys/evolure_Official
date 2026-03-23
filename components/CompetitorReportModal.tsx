
import React, { useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Search, FileText, TrendingUp } from 'lucide-react';
import { AnalyzedCompetitor, Score } from '../types';
import { RadarChartComponent } from './RadarChartComponent';
import { SCORE_CATEGORY_KEYS } from '../constants';
import { ReportSection } from './ReportSection';

interface CompetitorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitor: AnalyzedCompetitor | null;
  userPlan: { name: string, scores: Score } | null;
}

export const CompetitorReportModal: React.FC<CompetitorReportModalProps> = ({ isOpen, onClose, competitor, userPlan }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements?.[0] || closeButtonRef.current;
        const lastElement = focusableElements?.[focusableElements.length - 1] || closeButtonRef.current;

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

        closeButtonRef.current?.focus();
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !competitor) return null;

  const comparisonChartData = useMemo(() => {
    const data: { name: string; scores: Score }[] = [];
    if (userPlan) {
        data.push(userPlan);
    }
    data.push({ name: competitor.name, scores: competitor.scores });
    return data;
  }, [competitor, userPlan]);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="competitor-report-title"
        className="bg-white text-stone-800 rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-stone-200 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s ease-out forwards' }}
      >
        <header className="flex justify-between items-center p-6 border-b border-stone-100 flex-shrink-0 bg-white/90 backdrop-blur-md">
          <h2 id="competitor-report-title" className="text-2xl font-bold font-serif text-stone-900 flex items-center gap-3">
              <Search size={24} className="text-stone-800"/>
              AI 比較分析レポート
          </h2>
          <button ref={closeButtonRef} onClick={onClose} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="flex-grow grid md:grid-cols-12 overflow-hidden">
          <div className="md:col-span-5 lg:col-span-4 bg-stone-50 p-6 overflow-y-auto border-r border-stone-200 space-y-8">
            <section>
                <h3 className="text-lg font-serif font-bold text-stone-900 mb-4">比較対象製品</h3>
                <div className="space-y-3 text-sm p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
                    <p className="font-bold text-stone-900 text-lg">{competitor.name}</p>
                </div>
            </section>
            
            <section>
                <h3 className="text-lg font-serif font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-stone-800"/>
                    効果分析チャート
                </h3>
                <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm h-[300px]">
                    <RadarChartComponent data={comparisonChartData} categories={SCORE_CATEGORY_KEYS} />
                </div>
            </section>

             {competitor.citations && competitor.citations.length > 0 && (
                <section>
                    <h3 className="text-lg font-serif font-bold text-stone-900 mb-4">参照元情報</h3>
                     <div className="space-y-2 text-sm p-5 bg-white rounded-2xl border border-stone-100 shadow-sm max-h-60 overflow-y-auto">
                        <ul className="list-none p-0 m-0 space-y-2">
                            {competitor.citations.map((cite, idx) => (
                                <li key={idx}>
                                    <a href={cite.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-500 hover:text-stone-900 hover:underline break-all block leading-snug">
                                    {cite.title || cite.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
             )}

          </div>

          <main className="md:col-span-7 lg:col-span-8 overflow-y-auto p-8 md:p-10">
             <ReportSection icon={<FileText size={20}/>} title="総合分析レポート">
                <ReactMarkdown>{competitor.report.replace(/\[\d+\]/g, '').trim()}</ReactMarkdown>
             </ReportSection>
          </main>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.3s ease-out forwards;
        }
        .medical-chart-report-content h1,
        .medical-chart-report-content h2,
        .medical-chart-report-content h3,
        .medical-chart-report-content h4,
        .medical-chart-report-content h5,
        .medical-chart-report-content h6 {
            font-family: 'Noto Serif JP', serif;
            font-size: 1.1em;
            font-weight: 700;
            color: #1c1917;
            margin-top: 1.5em;
            margin-bottom: 0.75em;
            padding-bottom: 0;
            border-bottom: none;
        }
      `}</style>
    </div>
  );
};
