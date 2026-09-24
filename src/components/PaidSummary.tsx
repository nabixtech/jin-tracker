import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FileText, Calendar, CalendarRange, MoreVertical, Edit2, Trash2, Filter } from 'lucide-react';
import { deletePaymentTransaction } from '../lib/businessLogic';
import { EditPaymentDrawer } from './EditPaymentDrawer';
import { type PaymentHistory } from '../types';

export function PaidSummary() {
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [rangeStart, setRangeStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [oneOffOnly, setOneOffOnly] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentHistory | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const paidItems = useLiveQuery(
    async () => {
      let startDate: string, endDate: string;
      if (filterMode === 'month') {
        startDate = `${selectedMonth}-01`;
        endDate = `${selectedMonth}-31`;
      } else {
        startDate = rangeStart;
        endDate = rangeEnd;
      }

      const history = await db.paymentHistory
        .where('datePaid')
        .between(startDate, endDate, true, true)
        .reverse()
        .sortBy('datePaid');

      let enhancedHistory = await Promise.all(
        history.map(async (h) => {
          const item = await db.recurringItems.get(h.itemId);
          return {
            ...h,
            itemName: item?.name || 'Deleted Bill',
            category: item?.category || 'Unknown',
            frequency: item?.frequency || 'Unknown'
          };
        })
      );
      
      if (oneOffOnly) {
        enhancedHistory = enhancedHistory.filter(h => h.frequency === 'One-Off');
      }
      
      return enhancedHistory;
    },
    [selectedMonth, filterMode, rangeStart, rangeEnd, oneOffOnly]
  );

  const totalPaid = paidItems?.reduce((sum, item) => sum + item.costIncurred, 0) || 0;

  const getDateLabel = () => {
    if (filterMode === 'month') {
      return format(new Date(selectedMonth + '-01'), 'MMMM yyyy');
    }
    try {
      return `${format(new Date(rangeStart), 'MMM d, yyyy')} – ${format(new Date(rangeEnd), 'MMM d, yyyy')}`;
    } catch {
      return 'Custom Range';
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this payment record? Note: This will not change the parent bill's remaining balance or due date.")) {
      try {
        await deletePaymentTransaction(id);
        setMenuOpenId(null);
      } catch (error) {
        console.error("Failed to delete payment:", error);
        alert("Failed to delete payment.");
      }
    }
  };

  return (
    <>
      <div className="glass-panel rounded-2xl relative">
        {/* Decorative top border glow */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-electra-500/50 to-transparent"></div>
        
        <div className="p-5 md:p-6 border-b border-space-700/50 bg-space-800/80 rounded-t-2xl space-y-4">
          {/* Row 1: Title + Expenses Only toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center">
                <FileText size={18} className="text-electra-400 mr-2" />
                Paid Summary
              </h2>
              <p className="text-xs text-gray-400 mt-1 ml-6 tracking-wide uppercase">Historical Payments</p>
            </div>
            
            <button
              onClick={() => setOneOffOnly(!oneOffOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                oneOffOnly 
                  ? 'bg-electra-500/20 text-electra-400 border-electra-500/40 shadow-[0_0_10px_rgba(168,85,247,0.15)]' 
                  : 'bg-space-900 text-gray-400 border-space-700 hover:border-space-600 hover:text-gray-300'
              }`}
            >
              <Filter size={12} />
              {oneOffOnly ? 'Expenses Only' : 'All Payments'}
            </button>
          </div>
          
          {/* Row 2: Filter mode toggle + Date inputs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Segmented control */}
            <div className="flex bg-space-900 rounded-lg border border-space-700 overflow-hidden flex-shrink-0">
              <button
                onClick={() => setFilterMode('month')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  filterMode === 'month' 
                    ? 'bg-aqua-500/20 text-aqua-400' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Calendar size={12} />
                Month
              </button>
              <button
                onClick={() => setFilterMode('range')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  filterMode === 'range' 
                    ? 'bg-aqua-500/20 text-aqua-400' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <CalendarRange size={12} />
                Range
              </button>
            </div>
            
            {/* Date inputs */}
            {filterMode === 'month' ? (
              <div className="flex items-center space-x-3 bg-space-900 rounded-xl p-2 border border-space-700">
                <Calendar size={16} className="text-gray-400 ml-2" />
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-sm text-gray-200 focus:outline-none border-none p-1"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-space-900 rounded-xl p-2 border border-space-700">
                  <input 
                    type="date" 
                    value={rangeStart} 
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="bg-transparent text-sm text-gray-200 focus:outline-none border-none p-1"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <span className="text-gray-500 text-xs font-bold">→</span>
                <div className="flex items-center bg-space-900 rounded-xl p-2 border border-space-700">
                  <input 
                    type="date" 
                    value={rangeEnd} 
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="bg-transparent text-sm text-gray-200 focus:outline-none border-none p-1"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-5 md:p-6 bg-space-900/30 flex justify-between items-center border-b border-space-700/50">
          <span className="text-sm text-gray-400 font-medium">Total for {getDateLabel()}</span>
          <span className="text-xl font-bold text-electra-400">₱{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {!paidItems || paidItems.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500 rounded-b-2xl">
            <p className="text-sm">No payments recorded for this period.</p>
          </div>
        ) : (
          <div className="divide-y divide-space-700/50">
            {paidItems.map(item => (
              <div key={item.id} className="p-4 md:p-5 hover:bg-space-700/30 transition-colors flex justify-between items-center relative group last:rounded-b-2xl">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-100">{item.itemName}</h3>
                  <div className="flex items-center text-xs mt-1 space-x-2 text-gray-500">
                    <span>{item.datePaid}</span>
                    <span>•</span>
                    <span>{item.paymentMethodType}</span>
                    {item.frequency === 'One-Off' && (
                      <>
                        <span>•</span>
                        <span className="text-electra-400 bg-electra-500/10 px-1.5 py-0.5 rounded border border-electra-500/20 uppercase tracking-wider font-bold">{item.category}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right flex items-center">
                  <div className="text-lg font-bold text-gray-200 mr-4">
                    <span className="text-gray-500 font-normal mr-1 text-sm">₱</span>
                    {item.costIncurred.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  
                  <div className="relative" ref={menuOpenId === item.id ? menuRef : null}>
                    <button 
                      onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id!)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-space-700 rounded-full transition-colors focus:outline-none"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {menuOpenId === item.id && (
                      <div className="absolute right-0 top-10 mt-1 w-36 bg-space-800 border border-space-600 rounded-xl shadow-xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button
                          onClick={() => {
                            setEditingPayment(item);
                            setMenuOpenId(null);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-space-700 hover:text-aqua-400 flex items-center transition-colors"
                        >
                          <Edit2 size={14} className="mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id!)}
                          className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 flex items-center transition-colors border-t border-space-700/50"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditPaymentDrawer
        payment={editingPayment}
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
      />
    </>
  );
}
