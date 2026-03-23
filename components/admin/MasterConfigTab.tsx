import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { MasterConfig, MasterConfigCategory } from '../../types';
import { PlusCircle, Trash2, Edit2, Check, X, GripVertical, Database, ChevronUp, ChevronDown } from 'lucide-react';

const CATEGORIES: { value: MasterConfigCategory; label: string }[] = [
    { value: 'skin_concerns', label: '肌悩み' },
    { value: 'ideal_goals', label: '理想の肌' },
    { value: 'lifestyle_factors', label: '生活習慣' },
    { value: 'dissatisfactions', label: '現行製品への不満' },
    { value: 'trouble_history', label: 'トラブル履歴' },
    { value: 'concern_timings', label: '悩みのタイミング' },
    { value: 'current_lacks', label: '不足しているもの' },
    { value: 'usage_durations', label: '使用期間' },
];

export const MasterConfigTab: React.FC = () => {
    const { masterConfigs, addMasterConfig, updateMasterConfig, deleteMasterConfig, seedMasterConfigs } = useAdmin();
    const [selectedCategory, setSelectedCategory] = useState<MasterConfigCategory>('skin_concerns');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<Partial<MasterConfig>>({
        label: '',
        description: '',
        order: 0,
        isActive: true,
        category: 'skin_concerns'
    });

    const filteredConfigs = (masterConfigs || [])
        .filter(c => c.category === selectedCategory)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const handleAdd = async () => {
        if (!formData.label) return;
        await addMasterConfig({
            category: selectedCategory,
            label: formData.label!,
            description: formData.description || '',
            order: filteredConfigs.length,
            isActive: true,
            metadata: {}
        });
        setIsAdding(false);
        setFormData({ label: '', description: '', order: 0, isActive: true });
    };

    const handleUpdate = async (id: string) => {
        await updateMasterConfig(id, formData);
        setEditingId(null);
        setFormData({ label: '', description: '', order: 0, isActive: true });
    };

    const startEditing = (config: MasterConfig) => {
        setEditingId(config.id);
        setFormData(config);
    };

    const handleDelete = async (id: string, label: string) => {
        if (window.confirm(`「${label}」を削除してもよろしいですか？`)) {
            await deleteMasterConfig(id);
        }
    };

    const handleMove = async (id: string, direction: 'up' | 'down') => {
        const index = filteredConfigs.findIndex(c => c.id === id);
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === filteredConfigs.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const currentItem = filteredConfigs[index];
        const targetItem = filteredConfigs[targetIndex];

        // Swap orders
        await updateMasterConfig(currentItem.id, { order: targetItem.order });
        await updateMasterConfig(targetItem.id, { order: currentItem.order });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold text-stone-900">Master Configuration</h2>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === cat.value ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <h3 className="font-bold text-stone-700">{CATEGORIES.find(c => c.value === selectedCategory)?.label} 一覧</h3>
                    <span className="text-xs text-stone-400 font-mono">{filteredConfigs.length} items</span>
                </div>

                <div className="divide-y divide-stone-100">
                    {isAdding && (
                        <div className="p-4 bg-stone-50 flex items-center gap-4">
                            <input 
                                type="text" 
                                placeholder="Label" 
                                className="flex-grow p-2 border border-stone-200 rounded-lg text-sm"
                                value={formData.label}
                                onChange={e => setFormData({...formData, label: e.target.value})}
                                autoFocus
                            />
                            <input 
                                type="text" 
                                placeholder="Description (Optional)" 
                                className="flex-grow p-2 border border-stone-200 rounded-lg text-sm"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Check size={18}/></button>
                                <button onClick={() => setIsAdding(false)} className="p-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300"><X size={18}/></button>
                            </div>
                        </div>
                    )}

                    {filteredConfigs.map((config, index) => (
                        <div key={config.id} className="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors group">
                            <div className="flex flex-col gap-1">
                                <button 
                                    onClick={() => handleMove(config.id, 'up')}
                                    disabled={index === 0}
                                    className={`p-0.5 rounded hover:bg-stone-200 transition-colors ${index === 0 ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400'}`}
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <button 
                                    onClick={() => handleMove(config.id, 'down')}
                                    disabled={index === filteredConfigs.length - 1}
                                    className={`p-0.5 rounded hover:bg-stone-200 transition-colors ${index === filteredConfigs.length - 1 ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400'}`}
                                >
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            
                            {editingId === config.id ? (
                                <>
                                    <input 
                                        type="text" 
                                        className="flex-grow p-2 border border-stone-200 rounded-lg text-sm"
                                        value={formData.label}
                                        onChange={e => setFormData({...formData, label: e.target.value})}
                                    />
                                    <input 
                                        type="text" 
                                        className="flex-grow p-2 border border-stone-200 rounded-lg text-sm"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdate(config.id)} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Check size={18}/></button>
                                        <button onClick={() => setEditingId(null)} className="p-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300"><X size={18}/></button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex-grow">
                                        <p className="font-bold text-sm text-stone-900">{config.label}</p>
                                        {config.description && <p className="text-xs text-stone-500 mt-0.5">{config.description}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEditing(config)} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-lg transition-colors"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDelete(config.id, config.label)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {filteredConfigs.length === 0 && !isAdding && (
                        <div className="p-12 text-center text-stone-400">
                            <p>No items found in this category.</p>
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-2">
                    {filteredConfigs.length === 0 && (
                        <button 
                            onClick={seedMasterConfigs}
                            className="bg-stone-200 text-stone-600 font-bold py-2 px-4 rounded-xl hover:bg-stone-300 transition-colors flex items-center gap-2 text-sm"
                        >
                            <Database size={16} /> Seed Defaults
                        </button>
                    )}
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-stone-900 text-white font-bold py-2 px-4 rounded-xl hover:bg-black transition-colors flex items-center gap-2 text-sm"
                    >
                        <PlusCircle size={16} /> Add Item
                    </button>
                </div>
            </div>
        </div>
    );
};
