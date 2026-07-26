import { useState, useEffect } from 'react';
import { type RecurringItem, type PaymentMethodType } from '../types';
import { db } from '../db/database';
import { processPaymentTransaction } from '../lib/businessLogic';
import { X, Check, ExternalLink } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface MarkAsPaidDrawerProps {
  item: RecurringItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MarkAsPaidDrawer({ item, isOpen, onClose }: MarkAsPaidDrawerProps) {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethodType>('Cash/Bank');
  const [selectedCardId, setSelectedCardId] = useState<number | undefined>(undefined);
  const [isPartial, setIsPartial] = useState<boolean>(false);

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const creditCards = useLiveQuery(
    async () => {
      const cards = await db.recurringItems.where('category').equals('Credit Card').toArray();
      return cards.filter(c => !c.deletedAt);
    },
    []
  );

  useEffect(() => {
    if (isOpen && item) {
      setIsVisible(true);
      setIsAnimatingOut(false);
      setAmount(Math.max(0, item.remainingBalance ?? item.costEstimate));
      setIsPartial(false);

      if (item.id) {
        db.paymentHistory
          .where('itemId').equals(item.id).reverse().sortBy('datePaid')
          .then((history) => {
            if (history.length > 0) {
              setMethod(history[0].paymentMethodType);
              setSelectedCardId(history[0].chargedToItemId);
            } else {
              setMethod('Cash/Bank');
              setSelectedCardId(undefined);
            }
          }).catch(console.error);
      }
    }
  }, [isOpen, item]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  if (!isOpen && !isVisible) return null;
  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await processPaymentTransaction(item, amount, method, method === 'Credit Card' ? selectedCardId : undefined, isPartial);
      handleClose();
    } catch (error) {
      console.error("Failed to process payment:", error);
      alert("Error processing payment.");
    }
  };

  const inputClasses = "w-full bg-space-900 border border-space-700 text-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-aqua-500 focus:border-transparent outline-none transition-all placeholder-gray-500";
  const labelClasses = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-space-900/80 backdrop-blur-sm transition-opacity duration-300 ${!isOpen || isAnimatingOut ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${!isOpen || isAnimatingOut ? 'translate-y-full' : 'translate-y-0'} md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:bottom-0 md:translate-y-0 md:transition-transform md:duration-300 ${!isOpen || isAnimatingOut ? 'md:translate-x-full' : 'md:translate-x-0'}`}
      >
        <div className="glass-panel max-h-[90vh] md:h-full md:max-h-screen rounded-t-3xl md:rounded-t-none md:rounded-l-3xl p-6 flex flex-col relative border-b-0 md:border-r-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-[-10px_0_40px_rgba(0,0,0,0.5)]">

          <div className="flex-shrink-0">
            <div className="w-12 h-1.5 bg-space-700 rounded-full mx-auto mb-6 md:hidden" />

            <button onClick={handleClose} className="absolute top-6 right-6 text-gray-400 hover:text-aqua-400 transition-colors bg-space-900 p-2 rounded-full border border-space-700 z-10">
              <X size={18} />
            </button>

            <h2 className="text-2xl font-bold mb-1 text-white pr-10">Mark as Paid</h2>
            <p className="text-aqua-400 text-sm mb-6 flex items-center">
              {item.name} • Due {item.nextDueDate}
            </p>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 -mx-2 px-2 pb-20 md:pb-0 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">

              {item.paymentLink && (
                <div className="bg-space-900/50 p-4 rounded-2xl border border-space-700">
                  <label className={labelClasses}>Payment Link</label>
                  <a href={item.paymentLink} target="_blank" rel="noopener noreferrer" className="mt-1 py-3 w-full bg-aqua-500/10 text-aqua-400 border border-aqua-500/20 hover:bg-aqua-500 hover:text-space-900 rounded-xl text-center text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] uppercase tracking-wide">
                    Open Payment Portal <ExternalLink size={16} />
                  </a>
                </div>
              )}

              <div className="bg-space-900/50 p-4 rounded-2xl border border-space-700">
                <label className={labelClasses}>Amount Paid</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-aqua-500 font-bold text-sm">₱</span>
                  </div>
                  <input
                    required type="number" min="0" step="0.01"
                    className="w-full bg-space-800 border border-space-600 text-white rounded-xl py-4 pl-14 pr-4 text-xl font-medium focus:ring-2 focus:ring-aqua-500 outline-none transition-all"
                    value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))}
                  />
                </div>
                {item.isVariableCost && (
                  <p className="text-xs text-aqua-500/70 mt-2 flex items-center">
                    Variable bill. Please confirm final amount.
                  </p>
                )}

                {item.frequency !== 'One-Off' && (
                  <div className="flex items-center mt-4 bg-space-800 p-3 rounded-xl border border-space-700/50">
                    <input
                      type="checkbox" id="isPartial"
                      className="mr-3 h-5 w-5 text-aqua-500 focus:ring-aqua-500 border-space-600 rounded bg-space-900"
                      checked={isPartial} onChange={(e) => setIsPartial(e.target.checked)}
                    />
                    <label htmlFor="isPartial" className="text-sm text-gray-300 select-none">Partial payment (Keep due date)</label>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClasses}>Paid From</label>
                <select className={inputClasses} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodType)}>
                  <option value="Cash/Bank">Cash / Bank</option>
                  {item.category !== 'Credit Card' && <option value="Credit Card">Credit Card</option>}
                </select>
              </div>

              {method === 'Credit Card' && creditCards && creditCards.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className={labelClasses}>Which Card?</label>
                  <select
                    required className={inputClasses}
                    value={selectedCardId || ''} onChange={(e) => setSelectedCardId(parseInt(e.target.value))}
                  >
                    <option value="" disabled>Select card...</option>
                    {creditCards.map(card => (
                      <option key={card.id} value={card.id}>{card.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {method === 'Credit Card' && (!creditCards || creditCards.length === 0) && (
                <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                  No credit cards found in your bills.
                </p>
              )}

              <div className="pt-6 md:pb-6">
                <button
                  type="submit"
                  disabled={method === 'Credit Card' && (!creditCards || creditCards.length === 0)}
                  className="w-full py-4 text-sm font-bold text-white bg-gradient-to-r from-electra-500 to-aqua-500 hover:from-electra-400 hover:to-aqua-400 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide flex justify-center items-center"
                >
                  <Check size={18} className="mr-2" />
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
