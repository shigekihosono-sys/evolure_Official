
import React, { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Beaker, Search, Camera, FlaskConical, X, Loader2, FileText, Clock, BookOpen, Star, Sparkles, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { IngredientLabAnalysis, AdvancedProductAnalysis } from '../types';
import { analyzeIngredients, extractIngredientsFromPhoto, analyzeProductAdvanced, analyzeProductsFromPhoto } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface IngredientLabProps {
  setIsCameraOpen: (isOpen: boolean) => void;
  setCameraCaptureHandler: (handler: (dataUrl: string) => void) => void;
}

export const IngredientLab: React.FC<IngredientLabProps> = ({ setIsCameraOpen, setCameraCaptureHandler }) => {
  const [activeTab, setActiveTab] = useState<'product' | 'ingredient'>('product');

  // Ingredient Analysis State
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredientResults, setIngredientResults] = useState<IngredientLabAnalysis[]>([]);
  const [isIngredientLoading, setIsIngredientLoading] = useState(false);
  
  // Product Analysis State
  const [productNameInput, setProductNameInput] = useState('');
  const [productResult, setProductResult] = useState<AdvancedProductAnalysis | null>(null);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [isIdentifyingProduct, setIsIdentifyingProduct] = useState(false);

  const handleExtractFromPhoto = useCallback(async (imageDataUrl: string) => {
    toast.loading('写真から成分を抽出中...', { id: 'extracting' });
    try {
      const ingredients = await extractIngredientsFromPhoto(imageDataUrl);
      if (ingredients && ingredients.length > 0) {
        setIngredientInput(prev => prev ? `${prev}, ${ingredients.join(', ')}` : ingredients.join(', '));
        toast.success('成分を抽出し、入力欄に追加しました。', { id: 'extracting' });
      } else {
        toast.error('写真から成分を抽出できませんでした。', { id: 'extracting' });
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "成分抽出中にエラーが発生しました。";
      toast.error(errorMessage, { id: 'extracting' });
    }
  }, []);
  
  const handleIdentifyProductFromPhoto = useCallback(async (imageDataUrl: string) => {
    setIsIdentifyingProduct(true);
    toast.loading('写真から製品を特定中...', { id: 'identifying' });
    try {
      const productNames = await analyzeProductsFromPhoto(imageDataUrl);
      if (productNames && productNames.length > 0) {
        const identifiedProduct = productNames[0];
        setProductNameInput(identifiedProduct);
        toast.success(`製品「${identifiedProduct}」を特定しました。`, { id: 'identifying' });
      } else {
        toast.error('写真から製品を特定できませんでした。', { id: 'identifying' });
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "製品特定中にエラーが発生しました。";
      toast.error(errorMessage, { id: 'identifying' });
    } finally {
      setIsIdentifyingProduct(false);
    }
  }, []);
  
  const handleOpenCameraForIngredients = () => {
    setCameraCaptureHandler(handleExtractFromPhoto);
    setIsCameraOpen(true);
  };
  
  const handleOpenCameraForProduct = () => {
    setCameraCaptureHandler(handleIdentifyProductFromPhoto);
    setIsCameraOpen(true);
  };

  const handleAnalyzeIngredients = async () => {
    const ingredients = ingredientInput.split(',').map(s => s.trim()).filter(Boolean);
    if (ingredients.length === 0) {
      toast.error('分析する成分名を入力してください。');
      return;
    }
    
    setIsIngredientLoading(true);
    setIngredientResults([]);
    try {
      const results = await analyzeIngredients(ingredients);
      setIngredientResults(results);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "成分分析中にエラーが発生しました。";
      toast.error(errorMessage);
    } finally {
      setIsIngredientLoading(false);
    }
  };
  
  const handleAnalyzeProduct = async () => {
    if (!productNameInput.trim()) {
        toast.error('分析する製品名を入力してください。');
        return;
    }
    setIsProductLoading(true);
    setProductResult(null);
    try {
        const result = await analyzeProductAdvanced(productNameInput.trim());
        setProductResult(result);
    } catch(error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "製品分析中にエラーが発生しました。";
        toast.error(errorMessage);
    } finally {
        setIsProductLoading(false);
    }
  };


  const renderIngredientAnalysis = () => (
    <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="mb-8">
        <label htmlFor="ingredient-input" className="block text-xl font-serif font-bold text-stone-900 mb-3">
          分析したい成分名を入力
        </label>
        <p className="text-stone-500 mb-4 text-sm">複数の成分を分析する場合は、カンマ（,）で区切って入力してください。</p>
        <textarea
          id="ingredient-input"
          value={ingredientInput}
          onChange={e => setIngredientInput(e.target.value)}
          rows={4}
          placeholder="例: レチノール, ナイアシンアミド, ヒアルロン酸Na"
          className="w-full p-4 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 focus:outline-none bg-stone-50 text-stone-800 placeholder-stone-400 text-base resize-none transition-shadow"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleAnalyzeIngredients}
          disabled={isIngredientLoading}
          className="flex-1 bg-stone-900 text-white font-bold py-4 px-6 rounded-xl hover:bg-black transition-all duration-300 disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          {isIngredientLoading ? <Loader2 className="animate-spin" /> : <Beaker size={20} />}
          <span>{isIngredientLoading ? '分析中...' : 'AIで成分を分析する'}</span>
        </button>
        <button
          onClick={handleOpenCameraForIngredients}
          className="flex-1 bg-white text-stone-800 font-bold py-4 px-6 rounded-xl hover:bg-stone-50 transition-all duration-300 flex items-center justify-center gap-3 text-lg border border-stone-200 hover:border-stone-400 shadow-sm"
        >
          <Camera size={20} />
          <span>写真から成分を抽出</span>
        </button>
      </div>

      {isIngredientLoading && (
        <div className="mt-12 text-center">
          <LoadingSpinner text="AIが成分を分析中です..." />
        </div>
      )}
      
      {ingredientResults.length > 0 && (
        <div className="mt-12 space-y-6">
           <h3 className="text-2xl font-serif font-bold text-stone-900 border-b border-stone-100 pb-4 mb-6">分析結果</h3>
           {ingredientResults.map((result, index) => (
               <div key={index} className="bg-stone-50 p-6 rounded-2xl border border-stone-100 hover:shadow-md transition-shadow duration-300">
                  <h4 className="text-xl font-serif font-bold text-stone-900 mb-6 flex items-center gap-2">
                      <Sparkles size={18} className="text-stone-400" />
                      {result.name}
                  </h4>
                  <div className="space-y-5">
                    <div>
                      <p className="font-bold text-stone-700 flex items-center gap-2 mb-2 text-sm uppercase tracking-wide"><FileText size={16}/> 効果・効能</p>
                      <p className="text-stone-600 leading-relaxed bg-white p-4 rounded-xl border border-stone-100">{result.functions}</p>
                    </div>
                     <div>
                      <p className="font-bold text-stone-700 flex items-center gap-2 mb-2 text-sm uppercase tracking-wide"><BookOpen size={16}/> 科学的根拠</p>
                      <p className="text-stone-600 leading-relaxed bg-white p-4 rounded-xl border border-stone-100">{result.evidence}</p>
                    </div>
                     <div>
                      <p className="font-bold text-stone-700 flex items-center gap-2 mb-2 text-sm uppercase tracking-wide"><Clock size={16}/> 効果までの期間</p>
                      <p className="text-stone-600 leading-relaxed bg-white p-4 rounded-xl border border-stone-100">{result.timeframe}</p>
                    </div>
                  </div>
               </div>
           ))}
        </div>
      )}

    </div>
  );
  
  const renderProductAnalysis = () => (
     <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="mb-8">
        <label htmlFor="product-name-input" className="block text-xl font-serif font-bold text-stone-900 mb-3">
          分析したい製品名を入力
        </label>
        <p className="text-stone-500 mb-4 text-sm">ブランド名を含めた正式名称を入力するか、写真から製品を特定してください。</p>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
             <input
              id="product-name-input"
              value={productNameInput}
              onChange={e => setProductNameInput(e.target.value)}
              placeholder="例: SK-II フェイシャル トリートメント エッセンス"
              className="flex-grow p-4 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 focus:outline-none bg-stone-50 text-stone-800 placeholder-stone-400 text-base transition-shadow"
              disabled={isProductLoading || isIdentifyingProduct}
            />
            <button
                onClick={handleOpenCameraForProduct}
                disabled={isProductLoading || isIdentifyingProduct}
                className="bg-white text-stone-800 font-semibold py-3 px-6 rounded-xl hover:bg-stone-50 transition flex items-center justify-center gap-2 border border-stone-200 hover:border-stone-400 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isIdentifyingProduct ? <Loader2 className="animate-spin" /> : <Camera size={20} />}
                <span className="hidden sm:inline">写真から特定</span>
                <span className="sm:hidden">撮影</span>
            </button>
        </div>
        <div className="flex justify-center">
            <button
              onClick={handleAnalyzeProduct}
              disabled={isProductLoading || isIdentifyingProduct || !productNameInput.trim()}
              className="w-full bg-stone-900 text-white font-bold py-4 px-8 rounded-xl hover:bg-black transition-all duration-300 disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {isProductLoading ? <Loader2 className="animate-spin" /> : <Search size={20}/>}
              <span>{isProductLoading ? '分析中...' : 'AIで製品を分析'}</span>
            </button>
        </div>
      </div>
      
       {isProductLoading && (
        <div className="mt-12 text-center">
          <LoadingSpinner text="AIが製品を多角的に分析中です..." />
        </div>
      )}
      
      {productResult && (
        <div className="mt-12 space-y-10">
           <div className="border-b border-stone-100 pb-6">
                <h3 className="text-2xl font-serif font-bold text-stone-900 mb-2">AI分析レポート</h3>
                <p className="text-lg text-stone-600">「{productResult.productName}」</p>
           </div>
            
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">メーカー希望小売価格</p>
                <p className="text-3xl font-serif font-bold text-stone-900">{productResult.retailPrice}</p>
            </div>

            <div>
                <h4 className="text-lg font-serif font-bold text-stone-900 mb-4 flex items-center gap-2"><FileText size={20} /> 製品概要</h4>
                <div className="prose prose-stone prose-sm max-w-none bg-stone-50/50 p-6 rounded-2xl border border-stone-100 text-stone-600 leading-relaxed">
                    <ReactMarkdown>{productResult.productOverview}</ReactMarkdown>
                </div>
            </div>

            <div>
                <h4 className="text-lg font-serif font-bold text-stone-900 mb-4 flex items-center gap-2"><MessageCircle size={20} /> SNSでの声</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                        <h5 className="font-bold text-base text-stone-800 flex items-center gap-2 mb-4">
                            <ThumbsUp size={18} className="text-stone-400" />
                            ポジティブな声
                        </h5>
                        <ul className="space-y-3 text-sm text-stone-600 list-disc list-inside">
                            {productResult.positiveFeedback.map((fb, i) => <li key={`pos-${i}`} className="leading-relaxed">{fb}</li>)}
                        </ul>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                        <h5 className="font-bold text-base text-stone-800 flex items-center gap-2 mb-4">
                            <ThumbsDown size={18} className="text-stone-400" />
                            少しネガティブな声
                        </h5>
                        <ul className="space-y-3 text-sm text-stone-600 list-disc list-inside">
                            {productResult.negativeFeedback.map((fb, i) => <li key={`neg-${i}`} className="leading-relaxed">{fb}</li>)}
                        </ul>
                    </div>
                </div>
            </div>

            <div>
              <h4 className="text-lg font-serif font-bold text-stone-900 mb-6 flex items-center gap-2"><Beaker size={20} /> 有効成分のAI予測効果分析</h4>
              <div className="space-y-4">
                {productResult.ingredientBreakdown.map((item, index) => (
                  <div key={index} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-serif font-bold text-sm border border-stone-200">
                                {item.efficacyScore}
                            </div>
                            <div>
                                <h5 className="text-lg font-bold text-stone-900">{item.name}</h5>
                                <p className="text-xs text-stone-500 mt-0.5">
                                    推定配合率: <span className="font-medium text-stone-700">{item.estimatedConcentration}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-stone-50 px-3 py-1.5 rounded-full border border-stone-100">
                             {[1, 2, 3, 4, 5].map(score => (
                                <Star key={score} size={14} className={item.efficacyScore >= score ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300'} />
                            ))}
                        </div>
                    </div>
                    
                    <div className="prose prose-stone prose-sm max-w-none text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-100">
                        <ReactMarkdown>{item.efficacyAnalysis}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
                 <h4 className="text-lg font-serif font-bold text-stone-900 mb-4 flex items-center gap-2"><Sparkles size={20}/> AIによる総合評価</h4>
                  <div className="prose prose-stone prose-sm max-w-none bg-stone-900 text-stone-300 p-8 rounded-2xl shadow-lg leading-relaxed">
                    <ReactMarkdown>{productResult.overallVerdict}</ReactMarkdown>
                 </div>
            </div>

            {productResult.citations && productResult.citations.length > 0 && (
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                    <h4 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">参照元情報</h4>
                    <ul className="list-none space-y-2 text-xs">
                        {productResult.citations.map((cite, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="text-stone-300">•</span>
                                <a href={cite.uri} target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-900 hover:underline break-all transition-colors">
                                    {cite.title || cite.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-10">
      <div className="text-center animate-fade-in-up">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 flex items-center justify-center gap-4 tracking-tight">
            AI Cosmetics Lab
        </h2>
        <p className="text-stone-500 mt-4 text-lg max-w-2xl mx-auto leading-relaxed">
            気になる成分や製品の「本当の価値」を、AIが科学的見地から鑑定します。
        </p>
      </div>
      
      <div className="flex justify-center p-1.5 bg-stone-200/50 rounded-2xl border border-stone-200 max-w-lg mx-auto">
        <button 
          onClick={() => setActiveTab('product')}
          className={`flex-1 p-3 text-base font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'product' ? 'bg-white text-stone-900 shadow-md ring-1 ring-stone-900/5' : 'text-stone-500 hover:text-stone-800'}`}
        >
          <Search size={18} />
          製品名から
        </button>
        <button 
          onClick={() => setActiveTab('ingredient')}
          className={`flex-1 p-3 text-base font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'ingredient' ? 'bg-white text-stone-900 shadow-md ring-1 ring-stone-900/5' : 'text-stone-500 hover:text-stone-800'}`}
        >
          <FlaskConical size={18} />
          成分から
        </button>
      </div>

      <div className="animate-fade-in-scale">
        {activeTab === 'product' ? renderProductAnalysis() : renderIngredientAnalysis()}
      </div>

      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
        }
        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
            animation: fadeInScale 0.4s ease-out forwards;
        }
      `}</style>

    </div>
  );
};
