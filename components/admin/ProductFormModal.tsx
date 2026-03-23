
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Serum, Ampoule, Ingredient, Product } from '../../types';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Serum | Ampoule) => void;
    initialData: Serum | Ampoule | null;
    type: 'serum' | 'foundation' | 'performance';
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    type
}) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState<number | ''>('');
    const [subscriptionPrice, setSubscriptionPrice] = useState<number | ''>('');
    const [description, setDescription] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [ampouleFunction, setAmpouleFunction] = useState('');
    const [ampouleTarget, setAmpouleTarget] = useState('');
    const [isPublished, setIsPublished] = useState(true);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setPrice(initialData.price);
            setDescription(initialData.description);
            setIsPublished(initialData.isPublished !== false); // Default to true if undefined
            // Type guard to access specific fields
            if ('subscriptionPrice' in initialData) {
                setSubscriptionPrice(initialData.subscriptionPrice || '');
                setIngredients(initialData.ingredients || []);
            } else {
                setSubscriptionPrice('');
                setIngredients((initialData as any).ingredients || []);
                setAmpouleFunction((initialData as Ampoule).function || '');
                setAmpouleTarget((initialData as Ampoule).target || '');
            }
        } else {
            setName('');
            setPrice('');
            setSubscriptionPrice('');
            setDescription('');
            setIngredients([]);
            setAmpouleFunction('');
            setAmpouleTarget('');
            setIsPublished(true);
        }
    }, [initialData, isOpen]);

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { name: '', percentage: 0, effect: '' }]);
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value };
        setIngredients(newIngredients);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Construct the base object
        const baseProduct: any = {
            id: initialData?.id || `${type}-${Date.now()}`,
            name,
            price: Number(price),
            description,
            isPublished,
            // Simple logic: main ingredients are top 5 by percentage
            mainIngredients: ingredients
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5)
                .map(i => i.name),
            volume: initialData?.volume || (type === 'serum' ? 30 : 10),
        };

        if (type === 'serum') {
            baseProduct.subscriptionPrice = Number(subscriptionPrice);
            baseProduct.ingredients = ingredients;
        } else {
            baseProduct.type = type === 'foundation' ? 'Foundation' : 'Performance';
            baseProduct.function = ampouleFunction;
            baseProduct.target = ampouleTarget;
            // Store ingredients for ampoules too so we can re-edit and calculate scores
            baseProduct.ingredients = ingredients; 
        }

        onSave(baseProduct);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl">
                <header className="flex justify-between items-center p-6 border-b border-stone-100">
                    <h2 className="text-xl font-bold text-stone-900 font-serif">
                        {initialData ? 'Edit Product' : 'Add New Product'} ({type})
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 text-stone-500">
                        <X size={20} />
                    </button>
                </header>
                
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsPublished(!isPublished)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${isPublished ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}
                        >
                            {isPublished ? <Eye size={18} /> : <EyeOff size={18} />}
                            {isPublished ? 'Published' : 'Hidden'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Product Name</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">Price (JPY)</label>
                                <input
                                    required
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 outline-none"
                                />
                            </div>
                            {type === 'serum' && (
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-2">Sub. Price</label>
                                    <input
                                        required
                                        type="number"
                                        value={subscriptionPrice}
                                        onChange={e => setSubscriptionPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {type !== 'serum' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">Function</label>
                                <input
                                    required
                                    type="text"
                                    value={ampouleFunction}
                                    onChange={e => setAmpouleFunction(e.target.value)}
                                    placeholder="e.g. ハリ・弾力ケア"
                                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">Target</label>
                                <input
                                    required
                                    type="text"
                                    value={ampouleTarget}
                                    onChange={e => setAmpouleTarget(e.target.value)}
                                    placeholder="e.g. 乾燥による年齢サイン"
                                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Description</label>
                        <textarea
                            required
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 outline-none resize-none"
                        />
                    </div>

                    <div className="border-t border-stone-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-stone-900">Ingredients</h3>
                            <button
                                type="button"
                                onClick={handleAddIngredient}
                                className="text-sm font-bold text-stone-900 bg-stone-100 px-3 py-1.5 rounded-lg hover:bg-stone-200 flex items-center gap-1"
                            >
                                <Plus size={16} /> Add Ingredient
                            </button>
                        </div>
                        <div className="space-y-3">
                            {ingredients.map((ing, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={ing.name}
                                        onChange={e => handleIngredientChange(idx, 'name', e.target.value)}
                                        className="flex-grow p-2 border border-stone-200 rounded-lg text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="%"
                                        step="0.01"
                                        value={ing.percentage}
                                        onChange={e => handleIngredientChange(idx, 'percentage', Number(e.target.value))}
                                        className="w-20 p-2 border border-stone-200 rounded-lg text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Effect"
                                        value={ing.effect}
                                        onChange={e => handleIngredientChange(idx, 'effect', e.target.value)}
                                        className="flex-grow p-2 border border-stone-200 rounded-lg text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveIngredient(idx)}
                                        className="p-2 text-stone-400 hover:text-red-500"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {ingredients.length === 0 && (
                                <p className="text-sm text-stone-400 text-center py-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                    No ingredients added. Add ingredients to calculate scores automatically.
                                </p>
                            )}
                        </div>
                    </div>
                </form>

                <footer className="p-6 border-t border-stone-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-stone-900 text-white font-bold rounded-xl hover:bg-black transition-colors">
                        Save Product
                    </button>
                </footer>
            </div>
        </div>
    );
};
