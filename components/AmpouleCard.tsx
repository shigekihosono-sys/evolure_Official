
import React from 'react';
import { PlusCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { Ampoule } from '../types';
import { Tooltip } from './Tooltip';
import { INGREDIENT_DESCRIPTIONS } from '../constants';


interface AmpouleCardProps {
  ampoule: Ampoule;
  onSelect: () => void;
  isSelected: boolean;
  isRecommended: boolean;
  isDisabled: boolean;
  recommendationReason?: string;
  displayPrice?: number;
}

const getIngredientKey = (ingredientString: string): string => {
    return ingredientString
        .replace(/\s*\d+(\.\d+)?%/, '')
        .replace(/\(.*\)/, '')
        .trim();
};

export const AmpouleCard: React.FC<AmpouleCardProps> = ({ ampoule, onSelect, isSelected, isRecommended, isDisabled, recommendationReason, displayPrice }) => {
  const selectionClass = isSelected 
    ? 'border-stone-800 bg-stone-50 ring-2 ring-stone-800' 
    : 'border-stone-200 bg-white hover:border-stone-400';
    
  const disabledClass = isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-400';

  const ingredients = ampoule.mainIngredients;
  const priceToShow = displayPrice !== undefined ? displayPrice : ampoule.price;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
        onSelect();
        e.preventDefault();
    }
  };

  return (
    <div
      onClick={!isDisabled ? onSelect : undefined}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      className={`relative p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between h-full shadow-sm ${selectionClass} ${disabledClass}`}
    >
      <div>
        <div className="flex justify-between items-start gap-2 mb-3">
            <h4 className="font-bold text-stone-900 pr-8">{ampoule.name}</h4>
            <div className="flex-shrink-0">
            {isSelected ? <CheckCircle size={24} className="text-stone-900" /> : <PlusCircle size={24} className="text-stone-300" />}
            </div>
        </div>
        
        <div className="space-y-3 text-xs text-stone-500 mb-4">
            <div>
                <p className="font-semibold text-stone-600">機能:</p>
                <p className="mt-1">{ampoule.function}</p>
            </div>
             <div>
                <p className="font-semibold text-stone-600">主要成分:</p>
                <div className="flex flex-wrap gap-x-2 gap-y-1.5 mt-1">
                  {ingredients.map(ing => (
                    <Tooltip key={ing} content={INGREDIENT_DESCRIPTIONS[getIngredientKey(ing)] || '成分の説明は準備中です。'}>
                      <span className="text-xs py-0.5 px-1.5 bg-stone-100 rounded-md border border-stone-200 cursor-help whitespace-nowrap">
                        {ing}
                      </span>
                    </Tooltip>
                  ))}
                </div>
            </div>
        </div>

        {isRecommended && recommendationReason && (
            <div className="mt-auto p-2.5 bg-stone-100 border border-stone-200 rounded-lg">
                <div className="flex items-start gap-2">
                    <Lightbulb size={16} className="text-stone-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h5 className="font-bold text-xs text-stone-700">AI推奨</h5>
                        <p className="text-xs text-stone-600 mt-1">{recommendationReason}</p>
                    </div>
                </div>
            </div>
        )}

      </div>

      <div className="mt-4 text-right">
        <p className="font-bold text-lg text-stone-900">
          {priceToShow > 0 ? (
            <>
              {priceToShow.toLocaleString()}円
              <span className="text-xs font-normal text-stone-400 ml-1">(税抜)</span>
            </>
          ) : (
            '無料'
          )}
        </p>
      </div>
    </div>
  );
};
