
import React from 'react';
import { CheckCircle, Lightbulb } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelect: () => void;
  isSelected: boolean;
  isRecommended?: boolean;
  recommendationReason?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, isSelected, isRecommended = false, recommendationReason }) => {
  const selectedClasses = isSelected 
    ? 'border-stone-800 bg-stone-50 shadow-lg ring-1 ring-stone-800'
    : 'border-stone-200 bg-white hover:border-stone-400 hover:shadow-md';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
        onSelect();
        e.preventDefault();
    }
  };

  return (
    <div
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`relative border rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between h-full overflow-hidden ${selectedClasses}`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
             {isRecommended ? (
                 <div className="bg-stone-900 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                    RECOMMENDED
                  </div>
             ) : (<div></div>)}
            {isSelected && (
                <CheckCircle size={24} className="text-stone-900" />
            )}
        </div>

        <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">{product.name}</h3>
        <p className="text-stone-500 text-sm leading-relaxed min-h-[3rem]">{product.description}</p>
        
        {isRecommended && recommendationReason && (
            <div className="mt-4 p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
                <div className="flex items-start gap-2">
                    <Lightbulb size={16} className="text-stone-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-stone-600 leading-relaxed">{recommendationReason}</p>
                </div>
            </div>
        )}
      </div>
      
      <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 mt-auto">
        <p className="text-xl font-bold text-stone-900 text-right tracking-tight">
            {product.price.toLocaleString()}
            <span className="text-sm font-normal text-stone-500 ml-1">円(税抜)</span>
        </p>
      </div>
    </div>
  );
};
