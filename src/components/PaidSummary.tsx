import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { format } from 'date-fns';
import { FileText, Calendar } from 'lucide-react';

export function PaidSummary() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const paidItems = useLiveQuery(
    async () => {
      const history = await db.paymentHistory
        .where('datePaid')
        .between(`${selectedMonth}-01`, `${selectedMonth}-31`, true, true)
        .reverse()
        .sortBy('datePaid');

      const enhancedHistory = await Promise.all(
        history.map(async (h) => {
          const item = await db.recurringItems.get(h.itemId);
          return {
            ...h,
            itemName: item?.name || 'Deleted Bill',
            category: item?.category || 'Unknown'
          };
        })
      );
      
      return enhancedHistory;
    },
    [selectedMonth]
  );

  const totalPaid = paidItems?.reduce((sum, item) => sum + item.costIncurred, 0) || 0;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden relative">
      {/* Decorative top border glow */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-electra-500/50 to-transparent"></div>
      
      <div className="p-5 md:p-6 border-b border-space-700/50 bg-space-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center">
            <FileText size={18} className="text-electra-400 mr-2" />
            Paid Summary
          </h2>
          <p className="text-xs text-gray-400 mt-1 ml-6 tracking-wide uppercase">Historical Payments</p>
        </div>
        
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
      </div>
      
      <div className="p-5 md:p-6 bg-space-900/30 flex justify-between items-center border-b border-space-700/50">
        <span className="text-sm text-gray-400 font-medium">Total for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</span>
        <span className="text-xl font-bold text-electra-400">₱{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      {!paidItems || paidItems.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
          <p className="text-sm">No payments recorded for this month.</p>
        </div>
      ) : (
        <div className="divide-y divide-space-700/50">
          {paidItems.map(item => (
            <div key={item.id} className="p-4 md:p-5 hover:bg-space-700/30 transition-colors flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-gray-100">{item.itemName}</h3>
                <div className="flex items-center text-xs mt-1 space-x-2 text-gray-500">
                  <span>{item.datePaid}</span>
                  <span>•</span>
                  <span>{item.paymentMethodType}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-200">
                  <span className="text-gray-500 font-normal mr-1 text-sm">₱</span>
                  {item.costIncurred.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
