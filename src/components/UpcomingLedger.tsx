import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { type RecurringItem } from '../types';
import { skipBillingCycle } from '../lib/businessLogic';
import { MarkAsPaidDrawer } from './MarkAsPaidDrawer';
import { AddItemDrawer } from './AddItemDrawer';
import { CreditCard, Zap, Wrench, RefreshCw, AlertCircle, CheckCircle2, Trash2, Edit2, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

export function UpcomingLedger() {
  const [selectedItem, setSelectedItem] = useState<RecurringItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<RecurringItem | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const items = useLiveQuery(
    async () => {
      const allItems = await db.recurringItems.orderBy('nextDueDate').toArray();
      return allItems.filter(item => item.status !== 'Paid' && !item.deletedAt);
    },
    []
  );

  const handleMarkPaidClick = (item: RecurringItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (item: RecurringItem) => {
    setItemToEdit(item);
    setIsEditDrawerOpen(true);
  };

  const handleSkip = async (item: RecurringItem) => {
    if (confirm(`Skip ${item.name} for this month?`)) {
      await skipBillingCycle(item);
    }
  };

  const handleDelete = async (item: RecurringItem) => {
    if (confirm(`Are you sure you want to delete ${item.name}? This action cannot be undone.`)) {
      if (item.id) {
        const now = Date.now();
        await db.recurringItems.update(item.id, { deletedAt: now, updatedAt: now });
        
        const payments = await db.paymentHistory.where('itemId').equals(item.id).toArray();
        for (const p of payments) {
          if (p.id) await db.paymentHistory.update(p.id, { deletedAt: now, updatedAt: now });
        }
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Credit Card': return <CreditCard size={18} className="text-purple-400" />;
      case 'Utility': return <Zap size={18} className="text-yellow-400" />;
      case 'Maintenance': return <Wrench size={18} className="text-gray-400" />;
      case 'Subscription': return <RefreshCw size={18} className="text-blue-400" />;
      default: return <RefreshCw size={18} className="text-gray-400" />;
    }
  };

  const getDateStatus = (dateStr: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (dateStr < today) return { color: 'text-red-400', glow: 'shadow-[0_0_10px_rgba(248,113,113,0.2)]', border: 'border-red-500/30', icon: <AlertCircle size={14} className="mr-1" />, text: 'Critical' };
    if (dateStr === today) return { color: 'text-orange-400', glow: 'shadow-[0_0_10px_rgba(251,146,60,0.2)]', border: 'border-orange-500/30', icon: <AlertCircle size={14} className="mr-1" />, text: 'Imminent' };
    return { color: 'text-gray-400', glow: '', border: 'border-space-700/50', icon: null, text: '' };
  };

  if (!items) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-gray-500 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aqua-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel rounded-2xl overflow-hidden relative">
        {/* Decorative top border glow */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-aqua-500/50 to-transparent"></div>

        <div className="p-5 md:p-6 border-b border-space-700/50 bg-space-800/80">
          <h2 className="text-lg font-bold text-white flex items-center">
            <span className="w-2 h-2 rounded-full bg-aqua-500 mr-2 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"></span>
            Your Bills
          </h2>
          <p className="text-xs text-gray-400 mt-1 ml-4 tracking-wide uppercase">Sorted by Due Date</p>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-space-800 border border-space-700 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <CheckCircle2 size={32} className="text-aqua-500/50" />
            </div>
            <h3 className="text-lg font-medium text-gray-300">No Bills Yet</h3>
            <p className="text-gray-500 mt-1 text-sm mb-6">Add a bill to get started.</p>
            <button
              onClick={() => {
                import('../lib/seed').then(m => m.seedDatabase());
              }}
              className="px-6 py-3 bg-aqua-500/10 text-aqua-400 border border-aqua-500/30 hover:bg-aqua-500 hover:text-space-900 rounded-xl font-bold transition-all uppercase tracking-wide text-sm flex items-center shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              <RefreshCw size={16} className="mr-2" />
              Load Sample Data
            </button>
          </div>
        ) : (
          <div className="divide-y divide-space-700/50">
            {items.map(item => {
              const status = getDateStatus(item.nextDueDate);

              return (
                <div key={item.id} className="p-4 md:p-5 hover:bg-space-700/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl bg-space-900 border ${status.border} ${status.glow} flex-shrink-0 transition-all`}>
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-100 group-hover:text-aqua-300 transition-colors">{item.name}</h3>
                      <div className="flex items-center text-xs mt-1.5 space-x-3 text-gray-400">
                        <span className="uppercase tracking-wider">{item.category}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span className="uppercase tracking-wider">{item.frequency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end flex-1 gap-4 md:gap-6 mt-2 md:mt-0">
                    <div className="text-left md:text-right">
                      <div className="text-lg font-bold text-gray-100">
                        <span className="text-aqua-500/70 font-normal mr-1 text-sm">₱</span>
                        {Math.max(0, item.remainingBalance ?? item.costEstimate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {item.isVariableCost && <span className="text-[10px] text-gray-500 uppercase ml-1 align-top">Est</span>}
                      </div>
                      <div className={`flex items-center md:justify-end text-xs font-bold mt-1 uppercase tracking-wider ${status.color}`}>
                        {status.icon}
                        {status.text ? `${status.text} • ` : ''}{item.nextDueDate}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 relative">
                      <button
                        onClick={() => handleMarkPaidClick(item)}
                        className="px-3 md:px-4 py-2 bg-aqua-500/10 text-aqua-400 border border-aqua-500/20 hover:bg-aqua-500 hover:text-space-900 hover:border-aqua-500 font-bold rounded-lg transition-all flex items-center justify-center text-xs uppercase tracking-wide shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      >
                        Pay
                      </button>
                      
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : (item.id || null))}
                          className="p-2 text-gray-400 hover:bg-space-700 hover:text-gray-200 border border-transparent hover:border-space-600 rounded-lg transition-all flex items-center justify-center"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {openDropdownId === item.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenDropdownId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-36 bg-space-800 border border-space-700 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleEditClick(item);
                                }}
                                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-space-700 hover:text-white transition-colors"
                              >
                                <Edit2 size={14} className="mr-2" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleSkip(item);
                                }}
                                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-space-700 hover:text-white transition-colors"
                              >
                                <RefreshCw size={14} className="mr-2" /> Skip
                              </button>
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleDelete(item);
                                }}
                                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={14} className="mr-2" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MarkAsPaidDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={selectedItem}
      />
      <AddItemDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false);
          // Small delay before clearing item to let drawer close animation finish smoothly
          setTimeout(() => setItemToEdit(null), 300);
        }}
        itemToEdit={itemToEdit}
      />
    </>
  );
}
