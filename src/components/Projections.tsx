import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { format, parseISO } from 'date-fns';
import { TrendingUp, CreditCard } from 'lucide-react';
import { calculateTotalRemainingProjection } from '../lib/businessLogic';

export function Projections() {
  const projectedItems = useLiveQuery(
    async () => {
      // Get all active items that are fixed cost and have an end date
      const items = await db.recurringItems
        .filter(item => 
          item.status !== 'Paid' && 
          item.isVariableCost === false && 
          !!item.endDate &&
          !item.deletedAt
        )
        .toArray();
      
      // Sort by endDate asc
      items.sort((a, b) => {
        if (a.endDate! < b.endDate!) return -1;
        if (a.endDate! > b.endDate!) return 1;
        return 0;
      });

      // Enhance with linked card info
      const enhanced = await Promise.all(
        items.map(async (item) => {
          // Find the most recent payment
          const history = (await db.paymentHistory
            .where('itemId')
            .equals(item.id!)
            .reverse()
            .sortBy('datePaid')).filter(h => !h.deletedAt);
            
          let linkedCardName = undefined;
          
          if (history.length > 0 && history[0].paymentMethodType === 'Credit Card' && history[0].chargedToItemId) {
            const card = await db.recurringItems.get(history[0].chargedToItemId);
            linkedCardName = card?.name;
          }
          
          return {
            ...item,
            linkedCardName,
            projectedTotal: calculateTotalRemainingProjection(item)
          };
        })
      );

      return enhanced;
    },
    []
  );

  return (
    <div className="glass-panel rounded-2xl overflow-hidden relative">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
      
      <div className="p-5 md:p-6 border-b border-space-700/50 bg-space-800/80">
        <h2 className="text-lg font-bold text-white flex items-center">
          <TrendingUp size={18} className="text-purple-400 mr-2" />
          Payoff Projections
        </h2>
        <p className="text-xs text-gray-400 mt-1 ml-6 tracking-wide uppercase">
          Timeline for fixed obligations
        </p>
      </div>

      {!projectedItems || projectedItems.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
          <p className="text-sm">No fixed obligations with end dates found.</p>
        </div>
      ) : (
        <div className="divide-y divide-space-700/50">
          {projectedItems.map(item => (
            <div key={item.id} className="p-4 md:p-5 hover:bg-space-700/30 transition-colors flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-gray-100">{item.name}</h3>
                <div className="flex items-center text-xs mt-1.5 space-x-3">
                  <div className="flex items-center text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Ends {format(parseISO(item.endDate!), 'MMM yyyy')}
                  </div>
                  {item.linkedCardName && (
                    <div className="flex items-center text-gray-400">
                      <CreditCard size={12} className="mr-1" />
                      {item.linkedCardName}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-0.5 uppercase tracking-widest text-[10px] font-bold">Total Remaining</div>
                <div className="text-lg font-bold text-gray-200">
                  <span className="text-gray-500 font-normal mr-1 text-sm">₱</span>
                  {item.projectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
