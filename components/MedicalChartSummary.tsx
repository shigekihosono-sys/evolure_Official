
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, ArrowRight, RefreshCw, CheckCircle, Sparkles } from 'lucide-react';
import { MedicalChartReport } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface MedicalChartSummaryProps {
  report: MedicalChartReport | null;
  isLoading: boolean;
  onOpenModal: () => void;
  onRegenerate: () => void;
}

export const MedicalChartSummary: React.FC<MedicalChartSummaryProps> = ({ report, isLoading, onOpenModal, onRegenerate }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-12">
                    <LoadingSpinner size="md" />
                    <p className="text-stone-500 font-medium text-lg mt-6 font-serif">Generating Diagnosis...</p>
                </div>
            );
        }

        if (report && report.summaryBullets) {
            return (
                <div className="flex flex-col">
                    <div className="space-y-4 mb-8">
                         <div className="p-6 bg-stone-50 rounded-xl border border-stone-100">
                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Sparkles size={14} />
                                KEY INSIGHTS
                            </h4>
                            <ul className="space-y-4">
                                {report.summaryBullets.slice(0, 5).map((bullet, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 mt-2 rounded-full bg-stone-800 flex-shrink-0"></div>
                                        <span className="text-stone-700 leading-relaxed text-sm font-medium">{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                         </div>
                    </div>
                    <button 
                        onClick={onOpenModal}
                        className="group w-full bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20"
                    >
                        <span>View Full Report</span> 
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                <p className="font-serif font-semibold text-stone-700 text-lg mb-2">Update Required</p>
                <p className="text-stone-500 text-sm mb-6">プランの変更を反映するにはカルテを更新してください。</p>
                <button
                    onClick={onRegenerate}
                    className="bg-white border border-stone-300 text-stone-800 font-bold py-3 px-6 rounded-xl hover:bg-stone-100 transition-all duration-300 flex items-center justify-center gap-2"
                >
                    <RefreshCw size={18} />
                    Refresh Diagnosis
                </button>
            </div>
        );
    };

    return (
        <div className="p-8 bg-white rounded-3xl border border-stone-200 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-800 border border-stone-200">
                         <FileText size={20} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-stone-900">Diagnosis</h2>
                </div>
                <div className="text-[10px] font-bold text-stone-400 border border-stone-200 px-3 py-1 rounded-full tracking-wider uppercase bg-white">AI POWERED</div>
            </div>
            <div aria-live="polite">
              {renderContent()}
            </div>
        </div>
    );
};
