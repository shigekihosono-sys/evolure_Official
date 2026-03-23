
import React, { useMemo, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, UserCircle, Beaker, FileText, Lightbulb, TrendingUp, SlidersHorizontal, ShoppingCart, Clock, List, FileBarChart } from 'lucide-react';
import { CartItem, MedicalChartReport, Score, IngredientAnalysis, Serum, Ampoule, AnalyzedCompetitor } from '../types';
import { KNOWLEDGE_SCALE, SCORE_CATEGORY_KEYS } from '../constants';
import { RadarChartComponent } from './RadarChartComponent';
import { LoadingSpinner } from './LoadingSpinner';
import { ReportSection } from './ReportSection';

interface MedicalChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MedicalChartReport | null;
  userInfo: {
    ageGroup: string;
    skinType: string;
    skinConcerns: { [key: string]: number };
    knowledgeLevel: number;
    consultationType: 'concerns' | 'ideal' | 'investigate' | null;
    idealSkinGoal: string;
  };
  products: CartItem[];
  total: number;
  isLoading: boolean;
  analyzedUserProducts: AnalyzedCompetitor[] | null;
  fullPlanScores: Score | null;
  onAddToCart: () => void;
}

// Use any[] to handle potential schema mismatches from AI response robustly
const IngredientTable: React.FC<{ ingredients: any[] }> = ({ ingredients }) => {
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return <p className="text-stone-500 text-sm p-2">成分データの解析待ちです。</p>;
    }
    
    return (
        <div className="my-[-1rem] py-1">
            <table className="w-full text-left text-sm table-fixed">
                <thead className="border-b border-stone-200">
                    <tr>
                        <th className="p-2 pl-0 text-stone-800 font-semibold w-[25%] break-words font-serif">成分名</th>
                        <th className="p-2 text-stone-800 font-semibold w-[50%] break-words font-serif">効果・効能</th>
                        <th className="p-2 pr-0 text-stone-800 font-semibold w-[25%] flex items-center gap-1.5 break-words font-serif">
                            <Clock size={14}/> 時間軸
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {ingredients.map((ing, index) => {
                        if (!ing) return null;
                        
                        // Normalize keys to handle potential case sensitivity or variations
                        const name = ing.name || ing.Name || ing.ingredientName || '-';
                        
                        let desc = ing.description || ing.Description || 
                                     ing.functions || ing.Functions || 
                                     ing.effect || ing.Effect || 
                                     ing.efficacy || ing.Efficacy || '-';
                        
                        // Fallback if description is empty string
                        if (desc.trim() === '' || desc.trim() === '-') {
                            desc = '継続的な使用で効果が期待できます。';
                        }
                                     
                        let time = ing.timeframe || ing.Timeframe || 
                                     ing.timeFrame || 
                                     ing.duration || ing.Duration || '-';

                        // Fallback if timeframe is empty string
                        if (time.trim() === '' || time.trim() === '-') {
                             time = '2週間〜1ヶ月';
                        }

                        return (
                            <tr key={index} className="border-b border-stone-100">
                                <td className="p-2 pl-0 font-medium text-stone-800 align-top break-words">{name}</td>
                                <td className="p-2 text-stone-600 align-top break-words leading-relaxed">{desc}</td>
                                <td className="p-2 pr-0 text-stone-500 align-top break-words">{time}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};


export const MedicalChartModal: React.FC<MedicalChartModalProps> = ({ isOpen, onClose, report, userInfo, products, total, isLoading, analyzedUserProducts, fullPlanScores, onAddToCart }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mobileTab, setMobileTab] = useState<'summary' | 'report'>('summary');

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

  const knowledgeLabel = useMemo(() => {
      return KNOWLEDGE_SCALE.find(k => k.level === userInfo.knowledgeLevel)?.label || '未設定';
  }, [userInfo.knowledgeLevel]);

  const { serumConcentration, ampouleTotalConcentration } = useMemo(() => {
    let serumConc = 0;
    let ampouleTotalConc = 0;

    if (!Array.isArray(products)) return { serumConcentration: 0, ampouleTotalConcentration: 0 };

    const serumItem = products.find(item => item.product && 'baseScores' in item.product);
    if (serumItem) {
        const serum = serumItem.product as Serum;
        serumConc = serum.totalActiveConcentration || 0;
    }

    const ampouleItems = products.filter(item => item.product && !('baseScores' in item.product));
    ampouleItems.forEach(item => {
        const ampoule = item.product as Ampoule;
        if (ampoule && typeof ampoule.totalActiveConcentration === 'number') {
            ampouleTotalConc += ampoule.totalActiveConcentration;
        }
    });

    return {
        serumConcentration: serumConc,
        ampouleTotalConcentration: ampouleTotalConc,
    };
  }, [products]);

  const chartDataForAnalysis = useMemo(() => {
    if (userInfo.consultationType !== 'investigate' || !analyzedUserProducts || !fullPlanScores) {
      return null;
    }

    const data: { name: string; scores: Score }[] = [];
    if (Array.isArray(analyzedUserProducts) && analyzedUserProducts.length > 0) {
      data.push(...analyzedUserProducts);
    }
    data.push({ name: 'EVOLUREプラン', scores: fullPlanScores });
    
    return data;
  }, [userInfo.consultationType, analyzedUserProducts, fullPlanScores]);

  const handleAddToCartAndClose = () => {
    onAddToCart();
    onClose();
  };

  if (!isOpen) return null;

  // UI Components for Tabs
  const renderMobileTabs = () => (
    <div className="flex md:hidden border-b border-stone-200 bg-stone-50 flex-shrink-0">
      <button
        onClick={() => setMobileTab('summary')}
        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mobileTab === 'summary' ? 'text-stone-900 border-b-2 border-stone-900 bg-white' : 'text-stone-500 hover:bg-stone-100'}`}
      >
        <List size={16} />
        カルテ概要
      </button>
      <button
        onClick={() => setMobileTab('report')}
        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mobileTab === 'report' ? 'text-stone-900 border-b-2 border-stone-900 bg-white' : 'text-stone-500 hover:bg-stone-100'}`}
      >
        <FileBarChart size={16} />
        詳細レポート
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="medical-chart-title"
        className="bg-white text-stone-800 rounded-3xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-stone-200 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s ease-out forwards' }}
      >
        <header className="flex justify-between items-center p-4 md:p-6 border-b border-stone-100 flex-shrink-0 bg-white/90 backdrop-blur-md">
          <h2 id="medical-chart-title" className="text-xl md:text-2xl font-bold font-serif text-stone-900 flex items-center gap-2 md:gap-3">
              <FileText size={20} className="text-stone-800 md:w-6 md:h-6"/>
              EVOLURE AI 肌診断カルテ
          </h2>
          <button ref={closeButtonRef} onClick={onClose} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors">
            <X size={24} />
          </button>
        </header>

        {renderMobileTabs()}

        <div className="flex-grow flex flex-col md:grid md:grid-cols-12 overflow-hidden h-full">
          {/* Sidebar: Summary - Mobile: Shown only if tab is summary, Desktop: Always shown (col-span-4) */}
          <div className={`${mobileTab === 'summary' ? 'flex' : 'hidden'} md:flex md:col-span-4 lg:col-span-3 bg-stone-50 p-4 md:p-6 overflow-y-auto border-r border-stone-200 flex-col gap-6 md:gap-8 flex-shrink-0 h-full`}>
            <section>
                <h3 className="text-lg font-serif font-bold text-stone-900 mb-3 md:mb-4">お客様情報</h3>
                <div className="space-y-3 text-xs md:text-sm p-4 md:p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
                    <div className="flex justify-between">
                        <span className="text-stone-400">ID:</span>
                        <span className="font-mono text-stone-600">USER-{new Date().getTime().toString().slice(-6)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-400">診断日:</span>
                        <span className="font-medium text-stone-800">{new Date().toLocaleDateString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-400">年代:</span>
                        <span className="font-medium text-stone-800">{userInfo.ageGroup || '未設定'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-400">肌質:</span>
                        <span className="font-medium text-stone-800">{userInfo.skinType || '未設定'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-stone-400">知識レベル:</span>
                        <span className="font-medium text-stone-800">{knowledgeLabel}</span>
                    </div>
                </div>
            </section>
             <section>
                {userInfo.consultationType === 'concerns' || (userInfo.consultationType === 'ideal' && userInfo.skinConcerns && Object.keys(userInfo.skinConcerns).length > 0) ? (
                    <>
                        <h3 className="text-lg font-serif font-bold text-stone-900 mb-3 md:mb-4">主な肌悩み</h3>
                        <div className="space-y-2 p-4 md:p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
                            {userInfo.skinConcerns && Object.keys(userInfo.skinConcerns).length > 0 ? (
                                Object.entries(userInfo.skinConcerns)
                                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                                    .map(([concern, severity]) => (
                                        <div key={concern} className="flex justify-between items-center text-xs md:text-sm">
                                            <span className="text-stone-600">{concern}</span>
                                            <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">Lv. {severity}</span>
                                        </div>
                                    ))
                            ) : (
                                <p className="text-stone-400 text-sm">悩みは選択されていません</p>
                            )}
                        </div>
                    </>
                ) : (
                     <>
                        <h3 className="text-lg font-serif font-bold text-stone-900 mb-3 md:mb-4">なりたい肌の目標</h3>
                        <div className="p-4 md:p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
                           <p className="font-semibold text-stone-800 text-sm md:text-md">{userInfo.idealSkinGoal || '未設定'}</p>
                        </div>
                    </>
                )}
            </section>
            <section>
              <h3 className="text-lg font-serif font-bold text-stone-900 mb-3 md:mb-4">EVOLURE パーソナル処方</h3>
              <div className="p-4 md:p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
                <ul className="space-y-3 mb-6">
                  {Array.isArray(products) && products.map(item => (
                    <li key={item.product.id} className="flex justify-between items-start text-xs md:text-sm gap-2">
                      <span className="text-stone-600 leading-tight">{item.product.name}</span>
                      <span className="font-medium text-stone-900 flex-shrink-0 whitespace-nowrap">
                        {item.product.price > 0 ? (
                          <>
                            {item.product.price.toLocaleString()}
                            <span className="text-xs font-normal text-stone-400 ml-0.5">円(税抜)</span>
                          </>
                        ) : '無料'}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-end border-t border-stone-100 pt-4 mt-2">
                  <span className="font-bold text-sm text-stone-500">合計金額</span>
                  <span className="font-bold text-lg md:text-xl text-stone-900">
                    {total.toLocaleString()}
                    <span className="text-xs font-normal text-stone-400 ml-1">円(税抜)</span>
                  </span>
                </div>
                <button 
                  onClick={handleAddToCartAndClose}
                  className="w-full mt-6 bg-stone-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-stone-900/10 hover:shadow-stone-900/20 hover:-translate-y-0.5 text-sm md:text-base"
                >
                  <ShoppingCart size={18} />
                  カートに反映する
                </button>
              </div>
            </section>
            {chartDataForAnalysis && (
              <section>
                <h3 className="text-lg font-serif font-bold text-stone-900 mb-3 md:mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-stone-800"/>
                    効果分析チャート
                </h3>
                <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm h-[250px] md:h-[280px]">
                    <RadarChartComponent data={chartDataForAnalysis} categories={SCORE_CATEGORY_KEYS} />
                </div>
              </section>
            )}
          </div>

          {/* Main Content: Report - Mobile: Shown only if tab is report, Desktop: Always shown (col-span-8) */}
          <main className={`${mobileTab === 'report' ? 'flex' : 'hidden'} md:flex md:col-span-8 lg:col-span-9 overflow-y-auto p-4 md:p-10 flex-col h-full`} aria-live="polite">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center text-center py-10 h-full">
                <LoadingSpinner size="md" />
                <p className="text-stone-500 font-medium text-lg mt-4 font-serif">AIが診断レポートを生成中です...</p>
                <p className="text-stone-400 mt-2">お客様の肌状態に合わせて、最適なプランを分析しています。</p>
              </div>
            ) : report ? (
              <div className="space-y-8 md:space-y-10 max-w-4xl mx-auto">
                {report.knowledgeLevelRationale && (
                    <ReportSection icon={<Lightbulb size={20}/>} title="カルテの記述スタイルについて">
                        <ReactMarkdown>{report.knowledgeLevelRationale || ''}</ReactMarkdown>
                    </ReportSection>
                )}
                <ReportSection icon={<UserCircle size={20}/>} title="お客様の肌状態サマリー">
                  <ReactMarkdown>{report.patientSummary || ''}</ReactMarkdown>
                </ReportSection>
                <ReportSection icon={<FileText size={20}/>} title="処方意図">
                   <ReactMarkdown>{report.prescriptionIntent || ''}</ReactMarkdown>
                </ReportSection>
                <ReportSection icon={<Beaker size={20}/>} title="美容液の役割">
                    <div className="not-prose mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {serumConcentration > 0 && (
                            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">美容液の有効成分濃度</p>
                                <p className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight font-serif">{serumConcentration.toFixed(2)}%</p>
                            </div>
                        )}
                        {ampouleTotalConcentration > 0 && (
                            <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl">
                                <p className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">追加アンプルの総有効成分濃度</p>
                                <p className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight font-serif">{ampouleTotalConcentration.toFixed(2)}%</p>
                            </div>
                        )}
                    </div>
                   <ReactMarkdown>{report.serumRationale || ''}</ReactMarkdown>
                </ReportSection>
                
                {Array.isArray(report.ampouleRationales) && report.ampouleRationales.length > 0 && (
                  <ReportSection icon={<Lightbulb size={20}/>} title="アンプルによる個別対応">
                    {report.ampouleRationales.map((ar, i) => (
                      <div key={ar.ampouleId || i} className="mb-6 last:mb-0">
                         <ReactMarkdown>{ar.rationale || ''}</ReactMarkdown>
                      </div>
                    ))}
                  </ReportSection>
                )}

                <ReportSection icon={<TrendingUp size={20}/>} title="今後の展望とアドバイス">
                   <ReactMarkdown>{report.futureOutlook || ''}</ReactMarkdown>
                </ReportSection>
                {report.usageInstructions && (
                    <ReportSection icon={<SlidersHorizontal size={20}/>} title="ご使用方法">
                        <ReactMarkdown>{report.usageInstructions || ''}</ReactMarkdown>
                    </ReportSection>
                )}
                
                {Array.isArray(report.serumIngredientAnalysis) && report.serumIngredientAnalysis.length > 0 && (
                    <ReportSection icon={<Beaker size={20}/>} title="美容液の主要有効成分">
                        <IngredientTable ingredients={report.serumIngredientAnalysis} />
                    </ReportSection>
                )}

                {Array.isArray(report.ampouleIngredientAnalysis) && report.ampouleIngredientAnalysis.length > 0 && (
                    <ReportSection icon={<Lightbulb size={20}/>} title="アンプルの主要有効成分">
                        <IngredientTable ingredients={report.ampouleIngredientAnalysis} />
                    </ReportSection>
                )}
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center py-10 h-full">
                    <FileText size={48} className="text-stone-300 mb-4" />
                    <p className="text-stone-500 font-medium text-lg">診断カルテが表示されていません</p>
                    <p className="text-stone-400 mt-2">プランが変更された可能性があります。ダッシュボードからカルテを再生成してください。</p>
                </div>
            )}
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
        .medical-chart-report-content p {
            margin-bottom: 1em;
            line-height: 1.7;
        }
        .medical-chart-report-content strong {
            font-weight: 600;
            color: #1c1917;
        }
        .medical-chart-report-content {
            word-break: break-word;
            overflow-wrap: break-word;
        }
        .medical-chart-report-content pre {
            white-space: pre-wrap !important;
            word-break: break-word !important;
        }
      `}</style>
    </div>
  );
};
