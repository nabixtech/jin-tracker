import { useState, useEffect } from 'react';
import { type ItemCategory, type BillingFrequency, type RecurringItem, type PaymentMethodType } from '../types';
import { db } from '../db/database';
import { X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { processPaymentTransaction } from '../lib/businessLogic';
import { checkAndFireNotifications } from '../lib/notifications';
import { format } from 'date-fns';

interface AddItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: RecurringItem | null;
}

export function AddItemDrawer({ isOpen, onClose, itemToEdit }: AddItemDrawerProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Subscription');
  const [costEstimate, setCostEstimate] = useState<number>(0);
  const [frequency, setFrequency] = useState<BillingFrequency>('Monthly');
  const [nextDueDate, setNextDueDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentLink, setPaymentLink] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethodType>('Cash/Bank');
  const [selectedCardId, setSelectedCardId] = useState<number | undefined>(undefined);
  const [isVariableCost, setIsVariableCost] = useState<boolean>(false);
  const [isAutopay, setIsAutopay] = useState<boolean>(false);
  const [autopayMethod, setAutopayMethod] = useState<PaymentMethodType>('Cash/Bank');
  const [autopayChargedToItemId, setAutopayChargedToItemId] = useState<number | undefined>(undefined);
  const [autopayBankName, setAutopayBankName] = useState<string>('');
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
    if (isOpen) {
      setIsVisible(true);
      setIsAnimatingOut(false);
      
      if (itemToEdit) {
        setName(itemToEdit.name);
        setCategory(itemToEdit.category);
        setCostEstimate(itemToEdit.costEstimate);
        setFrequency(itemToEdit.frequency);
        setNextDueDate(itemToEdit.nextDueDate);
        setEndDate(itemToEdit.endDate || '');
        setPaymentLink(itemToEdit.paymentLink || '');
        setAccountNumber(itemToEdit.accountNumber || '');
        setIsVariableCost(itemToEdit.isVariableCost);
        setIsAutopay(itemToEdit.isAutopay || false);
        setAutopayMethod(itemToEdit.autopayMethod || 'Cash/Bank');
        setAutopayChargedToItemId(itemToEdit.autopayChargedToItemId);
        setAutopayBankName(itemToEdit.autopayBankName || '');
      } else {
        setName('');
        setCategory('Subscription');
        setCostEstimate(0);
        setFrequency('Monthly');
        setNextDueDate('');
        setEndDate('');
        setPaymentLink('');
        setAccountNumber('');
        setIsVariableCost(false);
        setIsAutopay(false);
        setAutopayMethod('Cash/Bank');
        setAutopayChargedToItemId(undefined);
        setAutopayBankName('');
      }
    }
  }, [isOpen, itemToEdit]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Matches transition duration
  };

  if (!isOpen && !isVisible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: RecurringItem = {
      syncId: itemToEdit && itemToEdit.syncId ? itemToEdit.syncId : crypto.randomUUID(),
      updatedAt: Date.now(),
      name,
      category,
      costEstimate,
      frequency,
      nextDueDate,
      isVariableCost,
      isAutopay,
      autopayMethod: isAutopay ? autopayMethod : undefined,
      autopayChargedToItemId: isAutopay && autopayMethod === 'Credit Card' ? autopayChargedToItemId : undefined,
      autopayBankName: isAutopay && autopayMethod === 'Cash/Bank' ? autopayBankName : undefined,
      paymentLink: paymentLink || '',
      accountNumber: accountNumber || '',
      ...(endDate && frequency !== 'One-Off' ? { endDate } : {}),
      status: itemToEdit ? itemToEdit.status : (frequency === 'One-Off' ? 'Paid' : 'Active')
    };
    
    if (frequency === 'One-Off' && !itemToEdit) {
      newItem.nextDueDate = format(new Date(), 'yyyy-MM-dd');
    }

    if (itemToEdit && itemToEdit.id) {
      await db.recurringItems.update(itemToEdit.id, newItem);
    } else {
      const newId = await db.recurringItems.add(newItem);
      
      if (frequency === 'One-Off') {
        await processPaymentTransaction(
          { ...newItem, id: newId } as RecurringItem,
          costEstimate,
          method,
          method === 'Credit Card' ? selectedCardId : undefined,
          false
        );
      }
    }
    
    // Check if the newly added/edited bill triggers a milestone today
    checkAndFireNotifications();
    
    handleClose();
  };

  const inputClasses = "w-full bg-space-900 border border-space-700 text-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-aqua-500 focus:border-transparent outline-none transition-all placeholder-gray-500";
  const labelClasses = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider";

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-space-900/80 backdrop-blur-sm transition-opacity duration-300 ${!isOpen || isAnimatingOut ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />
      
      {/* Bottom Sheet Drawer */}
      <div 
        className={`fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${!isOpen || isAnimatingOut ? 'translate-y-full' : 'translate-y-0'} md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:bottom-0 md:translate-y-0 md:transition-transform md:duration-300 ${!isOpen || isAnimatingOut ? 'md:translate-x-full' : 'md:translate-x-0'}`}
      >
        <div className="glass-panel max-h-[90vh] md:h-full md:max-h-screen rounded-t-3xl md:rounded-t-none md:rounded-l-3xl p-6 flex flex-col relative border-b-0 md:border-r-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-[-10px_0_40px_rgba(0,0,0,0.5)]">
          
          <div className="flex-shrink-0">
            <div className="w-12 h-1.5 bg-space-700 rounded-full mx-auto mb-6 md:hidden" />
            
            <button onClick={handleClose} className="absolute top-6 right-6 text-gray-400 hover:text-aqua-400 transition-colors bg-space-900 p-2 rounded-full border border-space-700 z-10">
              <X size={18} />
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-white bg-clip-text text-transparent bg-gradient-to-r from-aqua-400 to-electra-500 pr-10">
              {itemToEdit ? 'Edit Bill' : 'Add Bill'}
            </h2>
          </div>
          
          <div className="overflow-y-auto flex-1 min-h-0 -mx-2 px-2 pb-20 md:pb-0 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClasses}>Name</label>
                <input 
                  required type="text" className={inputClasses}
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Netflix, Electricity"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Category</label>
                  <select className={inputClasses} value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
                    <option value="Subscription">Subscription</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Utility">Utility</option>
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Frequency</label>
                  <select className={inputClasses} value={frequency} onChange={(e) => setFrequency(e.target.value as BillingFrequency)}>
                    <option value="One-Off">One-Off</option>
                    <option value="Semi-Monthly">Twice a Month (Every 15 days)</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Semi-Annually">Semi-Annually</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              </div>
              
              <div className={`grid ${frequency === 'One-Off' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <label className={labelClasses}>Est. Cost</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 font-medium text-sm">₱</span>
                    </div>
                    <input 
                      required type="number" min="0" step="0.01" className={`${inputClasses} pl-8`}
                      value={costEstimate} onChange={(e) => setCostEstimate(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
                {frequency !== 'One-Off' && (
                  <div>
                    <label className={labelClasses}>Next Due</label>
                    <input 
                      required type="date" className={inputClasses}
                      value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                )}
              </div>

              {frequency === 'One-Off' && !itemToEdit && (
                <>
                  <div>
                    <label className={labelClasses}>Paid From</label>
                    <select className={inputClasses} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodType)}>
                      <option value="Cash/Bank">Cash / Bank</option>
                      {category !== 'Credit Card' && <option value="Credit Card">Credit Card</option>}
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
                </>
              )}

              {frequency !== 'One-Off' && (
                <div>
                  <label className={labelClasses}>End Date (Optional)</label>
                  <input 
                    type="date" className={inputClasses}
                    value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              )}

              <div>
                <label className={labelClasses}>Payment Link (Optional)</label>
                <input 
                  type="url" className={inputClasses}
                  value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="https://pay.example.com"
                />
              </div>

              <div>
                <label className={labelClasses}>Account Number (Optional)</label>
                <input 
                  type="text" className={inputClasses}
                  value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 1234567890"
                />
              </div>

              <div className="flex items-center mt-2 bg-space-900/50 p-3 rounded-xl border border-space-700">
                <input 
                  type="checkbox" id="isVariable" 
                  className="mr-3 h-5 w-5 text-aqua-500 focus:ring-aqua-500 border-space-600 rounded bg-space-800"
                  checked={isVariableCost} onChange={(e) => setIsVariableCost(e.target.checked)}
                />
                <label htmlFor="isVariable" className="text-sm text-gray-300 select-none">Cost varies per cycle</label>
              </div>

              <div className="flex items-center mt-2 bg-space-900/50 p-3 rounded-xl border border-space-700">
                <input 
                  type="checkbox" id="isAutopay" 
                  className="mr-3 h-5 w-5 text-aqua-500 focus:ring-aqua-500 border-space-600 rounded bg-space-800"
                  checked={isAutopay} onChange={(e) => setIsAutopay(e.target.checked)}
                />
                <label htmlFor="isAutopay" className="text-sm text-gray-300 select-none">Auto-pay this bill</label>
              </div>

              {isAutopay && (
                <div className="bg-space-900/50 p-4 rounded-xl border border-space-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className={labelClasses}>Autopay Source</label>
                    <select className={inputClasses} value={autopayMethod} onChange={(e) => setAutopayMethod(e.target.value as PaymentMethodType)}>
                      <option value="Cash/Bank">Cash / Bank</option>
                      {category !== 'Credit Card' && <option value="Credit Card">Credit Card</option>}
                    </select>
                  </div>
                  
                  {autopayMethod === 'Credit Card' && creditCards && creditCards.length > 0 && (
                    <div>
                      <label className={labelClasses}>Which Card?</label>
                      <select 
                        required className={inputClasses}
                        value={autopayChargedToItemId || ''} onChange={(e) => setAutopayChargedToItemId(parseInt(e.target.value))}
                      >
                        <option value="" disabled>Select card...</option>
                        {creditCards.map(card => (
                          <option key={card.id} value={card.id}>{card.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {autopayMethod === 'Credit Card' && (!creditCards || creditCards.length === 0) && (
                    <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                      No credit cards found in your bills.
                    </p>
                  )}

                  {autopayMethod === 'Cash/Bank' && (
                    <div>
                      <label className={labelClasses}>Bank Name (Optional)</label>
                      <input 
                        type="text" className={inputClasses}
                        value={autopayBankName} onChange={(e) => setAutopayBankName(e.target.value)}
                        placeholder="e.g. BPI, BDO, UnionBank"
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div className="pt-6 md:pb-6">
                <button 
                  type="submit"
                  className="w-full py-3.5 text-sm font-bold text-space-900 bg-aqua-400 hover:bg-aqua-300 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all uppercase tracking-wide"
                >
                  {itemToEdit ? 'Update Bill' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
