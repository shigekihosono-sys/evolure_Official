
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, RefreshCw, ShoppingBag, Lock, TrendingUp } from 'lucide-react';
import { Serum, Ampoule, Score, AnalyzedCompetitor } from '../types';
import { ProductCard } from './ProductCard';
import { AmpouleCard } from './AmpouleCard';
import { RadarChartComponent } from './RadarChartComponent';
import { SCORE_CATEGORY_KEYS } from '../constants';

interface PlanSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSerum: Serum | null;
    onSelectSerum: (serum: Serum) => void;
    selectedFoundationAmpoules: Ampoule[];
    onToggleFoundationAmpoule: (ampoule: Ampoule) => void;
    selectedPerformanceAmpoules: Ampoule[];
    onTogglePerformanceAmpoule: (ampoule: Ampoule) => void;
    recommendationReasons: { [key: string]: string };
    purchaseType: 'subscription' | 'one-time';
    onSetPurchaseType: (type: 'subscription' | 'one-time') => void;
    availableSerums: Serum[];
    availableFoundationAmpoules: Ampoule[];
    availablePerformanceAmpoules: Ampoule[];
    fullPlanScores: Score | null;
    analyzedUserProducts: AnalyzedCompetitor[] | null;
}

type Tab = 'serum' | 'foundation' | 'performance';

export const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
    isOpen,
    onClose,
    selectedSerum,
    onSelectSerum,
    selectedFoundationAmpoules,
    onToggleFoundationAmpoule,
    selectedPerformanceAmpoules,
    onTogglePerformanceAmpoule,
    recommendationReasons,
    purchaseType,
    onSetPurchaseType,
    availableSerums,
    availableFoundationAmpoules,
    availablePerformanceAmpoules,
    fullPlanScores,
    analyzedUserProducts
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('serum');
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

    // 排他制御ロジック
    const isFoundationSelectionDisabled = useMemo(() => {
        return purchaseType === 'subscription' && selectedPerformanceAmpoules.length > 0;
    }, [purchaseType, selectedPerformanceAmpoules]);

    const isPerformanceSelectionDisabled = useMemo(() => {
        return purchaseType === 'subscription' && selectedFoundationAmpoules.length > 0;
    }, [purchaseType, selectedFoundationAmpoules]);

    const isFreeFoundationEligible = useMemo(() => {
        return selectedPerformanceAmpoules.length === 0 && purchaseType === 'subscription';
    }, [selectedPerformanceAmpoules, purchaseType]);
    
    const firstSelectedFoundationId = useMemo(() => {
        if (!isFreeFoundationEligible || selectedFoundationAmpoules.length === 0) return null;
        const sorted = [...selectedFoundationAmpoules].sort((a, b) => a.id.localeCompare(b.id));
        return sorted[0].id;
    }, [isFreeFoundationEligible, selectedFoundationAmpoules]);

    const chartData = useMemo(() => {
        if (!selectedSerum || !fullPlanScores) return [];
        const data = [];
        
        // Base Serum
        data.push({
            name: '美容液のみ',
            scores: selectedSerum.baseScores
        });

        // Current Plan
        // Using "EVOLUREプラン" or "アンプル追加後" to trigger primary color in RadarChartComponent
        data.push({
            name: 'EVOLUREプラン',
            scores: fullPlanScores
        });

        // Competitors
        if (analyzedUserProducts) {
            analyzedUserProducts.forEach(c => {
                data.push({
                    name: c.name,
                    scores: c.scores
                });
            });
        }

        return data;
    }, [selectedSerum, fullPlanScores, analyzedUserProducts]);

    const tabs: { id: Tab, label: string, count?: number, disabled?: boolean }[] = [
        { id: 'serum', label: 'ベース美容液', count: availableSerums.filter(s => s.id === selectedSerum?.id).length },
        { id: 'foundation', label: 'ファウンデーションアンプル', count: selectedFoundationAmpoules.length, disabled: purchaseType !== 'subscription' },
        { id: 'performance', label: 'パフォーマンスアンプル', count: selectedPerformanceAmpoules.length, disabled: purchaseType !== 'subscription' },
    ];

    if (!isOpen) return null;

    const renderSerumTab = () => (
        <div className="grid grid-cols-1 gap-4">
            {availableSerums.map(serum => (
                <ProductCard
                    key={serum.id}
                    product={{
                        ...serum,
                        price: purchaseType === 'subscription' && serum.subscriptionPrice ? serum.subscriptionPrice : serum.price
                    }}
                    onSelect={() => onSelectSerum(serum)}
                    isSelected={selectedSerum?.id === serum.id}
                    isRecommended={!!recommendationReasons[serum.id]}
                    recommendationReason={recommendationReasons[serum.id]}
                />
            ))}
        </div>
    );
    
    const renderFoundationTab = () => (
        <div>
            {isFoundationSelectionDisabled && (
                <div className="bg-stone-100 border border-stone-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-stone-800">
                    <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="font-bold mb-1">有料アンプルが選択されています</p>
                        <p>ファウンデーションアンプル（無料枠あり）を選択するには、先に選択中のパフォーマンスアンプルをすべて解除してください。</p>
                    </div>
                </div>
            )}
            <p className={`text-sm text-stone-500 mb-4 ${isFoundationSelectionDisabled ? 'opacity-50' : ''}`}>
                {isFreeFoundationEligible 
                    ? <span className="font-bold text-stone-800">1つまで無料。2つめからは1,089円(税込)です。</span> 
                    : '有料アンプル選択時は無料枠は適用されません。'}
                複数選択可能です。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableFoundationAmpoules.map(ampoule => {
                    const isSelected = selectedFoundationAmpoules.some(a => a.id === ampoule.id);
                    const isDisabled = isFoundationSelectionDisabled && !isSelected;
                    
                    let priceToShow = ampoule.price;
                    if (isFreeFoundationEligible) {
                        if (isSelected && ampoule.id === firstSelectedFoundationId) priceToShow = 0;
                        else if (!isSelected && selectedFoundationAmpoules.length === 0) priceToShow = 0;
                    }
                    return (
                        <AmpouleCard 
                            key={ampoule.id} 
                            ampoule={ampoule} 
                            onSelect={() => onToggleFoundationAmpoule(ampoule)}
                            isSelected={isSelected} 
                            isRecommended={!!recommendationReasons[ampoule.id]} 
                            isDisabled={isDisabled}
                            recommendationReason={recommendationReasons[ampoule.id]}
                            displayPrice={priceToShow}
                        />
                    );
                })}
            </div>
        </div>
    );

    const renderPerformanceTab = () => (
        <div>
            {isPerformanceSelectionDisabled && (
                <div className="bg-stone-100 border border-stone-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-stone-800">
                    <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="font-bold mb-1">無料アンプルが選択されています</p>
                        <p>パフォーマンスアンプル（有料）を選択するには、先に選択中のファウンデーションアンプルをすべて解除してください。</p>
                    </div>
                </div>
            )}
             <p className={`text-sm text-stone-500 mb-4 ${isPerformanceSelectionDisabled ? 'opacity-50' : ''}`}>
                 高度な肌悩みにアプローチする、有料のオプションアンプルです。
             </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availablePerformanceAmpoules.map(ampoule => {
                    const isSelected = selectedPerformanceAmpoules.some(a => a.id === ampoule.id);
                    const isDisabled = isPerformanceSelectionDisabled && !isSelected;

                    return (
                        <AmpouleCard 
                            key={ampoule.id} 
                            ampoule={ampoule} 
                            onSelect={() => onTogglePerformanceAmpoule(ampoule)}
                            isSelected={isSelected} 
                            isRecommended={!!recommendationReasons[ampoule.id]} 
                            isDisabled={isDisabled}
                            recommendationReason={recommendationReasons[ampoule.id]}
                        />
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="plan-selection-title"
                className="bg-stone-50 text-stone-800 rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-stone-200"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-stone-200 flex-shrink-0 bg-white">
                    <h2 id="plan-selection-title" className="text-xl md:text-2xl font-bold text-stone-900 font-serif">プランを編集</h2>
                    <button ref={closeButtonRef} onClick={onClose} className="p-2 rounded-full text-stone-500 hover:bg-stone-100"><X /></button>
                </header>
                
                {/* Purchase Type Toggle Switch - Mobile only (shown at top) */}
                <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                    <div>
                        <span className="text-sm font-bold text-stone-700 block mb-1">購入プラン</span>
                        <span className="text-xs text-stone-500">定期配送ならアンプルを追加・カスタマイズできます。</span>
                    </div>
                    <div className="flex bg-white p-1 rounded-lg border border-stone-200 shadow-sm flex-shrink-0">
                        <button 
                            onClick={() => onSetPurchaseType('subscription')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${purchaseType === 'subscription' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}
                        >
                            <RefreshCw size={16} />
                            定期配送
                        </button>
                        <button 
                            onClick={() => onSetPurchaseType('one-time')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${purchaseType === 'one-time' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}
                        >
                            <ShoppingBag size={16} />
                            都度購入
                        </button>
                    </div>
                </div>
                
                <div className="flex h-full overflow-hidden">
                    {/* Left Column: Tabs & Content */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                        <div className="flex border-b border-stone-200 flex-shrink-0 bg-white" role="tablist" aria-label="プラン編集タブ">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    id={`tab-${tab.id}`}
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    aria-controls={`tabpanel-${tab.id}`}
                                    onClick={() => !tab.disabled && setActiveTab(tab.id)}
                                    disabled={tab.disabled}
                                    className={`flex-1 p-4 font-semibold text-center transition-colors relative ${activeTab === tab.id ? 'text-stone-900' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'} ${tab.disabled ? 'opacity-40 cursor-not-allowed bg-stone-50' : ''}`}
                                >
                                    <span className="block text-xs md:text-sm">{tab.label}</span>
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className="absolute top-2 right-2 md:static md:ml-2 bg-stone-900 text-white text-[10px] md:text-xs font-bold rounded-full px-1.5 py-0.5 md:px-2 md:py-0.5 min-w-[1.2em] text-center">{tab.count}</span>
                                    )}
                                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900"></div>}
                                </button>
                            ))}
                        </div>

                        <div className="flex-grow overflow-y-auto p-6">
                            {purchaseType !== 'subscription' && activeTab !== 'serum' ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 animate-fade-in-up">
                                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-2">
                                        <Lock size={32} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg text-stone-700 mb-1">アンプルは定期配送限定オプションです</p>
                                        <p className="text-stone-500 text-sm max-w-md mx-auto">
                                            アンプルを追加して処方をカスタマイズするには, 購入プランを「定期配送」に変更してください。
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => onSetPurchaseType('subscription')}
                                        className="mt-4 px-6 py-2 bg-stone-900 text-white font-bold rounded-lg hover:bg-black transition-colors shadow-md"
                                    >
                                        定期配送に切り替える
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div id="tabpanel-serum" role="tabpanel" aria-labelledby="tab-serum" hidden={activeTab !== 'serum'} className="animate-fade-in-up">
                                    {renderSerumTab()}
                                    </div>
                                    <div id="tabpanel-foundation" role="tabpanel" aria-labelledby="tab-foundation" hidden={activeTab !== 'foundation'} className="animate-fade-in-up">
                                    {renderFoundationTab()}
                                    </div>
                                    <div id="tabpanel-performance" role="tabpanel" aria-labelledby="tab-performance" hidden={activeTab !== 'performance'} className="animate-fade-in-up">
                                    {renderPerformanceTab()}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Real-time Chart (Hidden on small screens) */}
                    <div className="w-[320px] bg-stone-50 border-l border-stone-200 hidden lg:flex flex-col p-6 overflow-y-auto">
                        <div className="mb-6">
                            <h3 className="text-lg font-serif font-bold text-stone-900 mb-1 flex items-center gap-2">
                                <TrendingUp size={20} className="text-stone-800"/>
                                効果分析データ
                            </h3>
                            <p className="text-xs text-stone-500">プラン変更による効果の変化をリアルタイムに確認できます。</p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm h-[300px] mb-6">
                            <RadarChartComponent data={chartData} categories={SCORE_CATEGORY_KEYS} />
                        </div>

                        {selectedSerum && (
                            <div className="space-y-4">
                                <div className="p-4 bg-white rounded-xl border border-stone-100 shadow-sm">
                                    <p className="text-xs font-bold text-stone-400 uppercase mb-1">ベース美容液</p>
                                    <p className="font-bold text-stone-800 text-sm">{selectedSerum.name}</p>
                                </div>
                                {(selectedFoundationAmpoules.length > 0 || selectedPerformanceAmpoules.length > 0) && purchaseType === 'subscription' && (
                                    <div className="p-4 bg-white rounded-xl border border-stone-100 shadow-sm">
                                        <p className="text-xs font-bold text-stone-400 uppercase mb-2">追加アンプル</p>
                                        <ul className="space-y-2">
                                            {[...selectedFoundationAmpoules, ...selectedPerformanceAmpoules].map(a => (
                                                <li key={a.id} className="flex items-center gap-2 text-xs font-medium text-stone-700">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-stone-400"></div>
                                                    {a.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <footer className="p-4 border-t border-stone-200 flex-shrink-0 flex justify-end bg-white">
                    <button 
                        onClick={onClose}
                        className="bg-stone-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-stone-900/20"
                    >
                        <CheckCircle size={20}/>
                        選択を完了する
                    </button>
                </footer>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
