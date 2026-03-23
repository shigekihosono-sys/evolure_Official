
import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (index: number) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, cart, onRemoveItem }) => {
  // FIX: priceAtPurchase が 0 の場合に正しく計算されるよう ?? (Nullish coalescing) を使用
  const subtotal = cart.reduce((sum, item) => {
    const price = item.priceAtPurchase ?? item.product.price;
    return sum + (price * item.quantity);
  }, 0);

  // 消費税計算 (10%)
  const tax = Math.round(subtotal * 0.1);
  const totalWithTax = subtotal + tax;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform animate-slide-in-right">
        <div className="p-6 flex items-center justify-between border-b border-stone-100 bg-white/95 backdrop-blur-sm z-10">
          <h2 className="text-2xl font-serif font-bold text-stone-900">Shopping Cart</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-900">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
              <p className="font-medium">カートは空です</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={`${item.product.id}-${index}`} className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex justify-between group transition-all hover:border-stone-300">
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-sm text-stone-900 mb-2 leading-snug">{item.product.name}</h4>
                    <div className="flex justify-between items-end">
                        <p className="text-xs text-stone-500">数量: {item.quantity}</p>
                        <p className="text-sm font-bold text-stone-900">
                            {(item.priceAtPurchase !== undefined ? item.priceAtPurchase : item.product.price).toLocaleString()} 円(税抜)
                        </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemoveItem(index)}
                    className="text-stone-300 hover:text-red-500 transition-colors self-start p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-stone-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 space-y-3">
            <div className="flex justify-between items-center text-sm text-stone-500">
              <span>小計 (税抜)</span>
              <span>{subtotal.toLocaleString()} 円</span>
            </div>
            <div className="flex justify-between items-center text-sm text-stone-500">
              <span>消費税 (10%)</span>
              <span>{tax.toLocaleString()} 円</span>
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-stone-50">
              <span className="font-bold text-stone-900 text-lg">合計 (税込)</span>
              <div className="text-right">
                <p className="text-3xl font-bold text-stone-900 leading-none">
                    {totalWithTax.toLocaleString()}
                    <span className="text-xs font-normal text-stone-500 ml-1">円</span>
                </p>
                <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-wider font-bold">Tax Included / 税込価格</p>
              </div>
            </div>
            <button className="w-full mt-4 bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg shadow-stone-900/10">
              Checkout
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slide-in-right {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        .animate-slide-in-right {
            animation: slide-in-right 0.3s cubic-bezier(0.2, 0, 0, 1) forwards;
        }
      `}</style>
    </div>
  );
};
