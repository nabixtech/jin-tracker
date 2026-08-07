import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { format, parseISO } from 'date-fns';
import { TrendingUp, CreditCard, Zap } from 'lucide-react';
import { calculateTotalRemainingProjection } from '../lib/businessLogic';

function getMonthlyCost(costEstimate: number, frequency: string): number {
  if (frequency === 'Semi-Monthly') return costEstimate * 2;
  if (frequency === 'Monthly') return costEstimate;
  if (frequency === 'Semi-Annually') return costEstimate / 6;
  if (frequency === 'Annually') return costEstimate / 12;
  return 0; // One-Off
}

export function Projections() {
  const projectedItems = useLiveQuery(
    async () => {
      // Get all active items that are fixed cost and have an end date
      const items = await db.recurringItems
        .filter(item => 
          item.status !== 'Paid' && 
          item.isVariableCost === false && 
          !item.deletedAt
        )
        .toArray();
      
      // Sort by endDate asc, ongoing items (no endDate) at the bottom
      items.sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        if (a.endDate < b.endDate) return -1;
        if (a.endDate > b.endDate) return 1;
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
          
          let autopayText = undefined;
          if (item.isAutopay) {
            if (item.autopayMethod === 'Cash/Bank' && item.autopayBankName) {
              autopayText = item.autopayBankName;
            } else if (item.autopayMethod === 'Credit Card' && item.autopayChargedToItemId) {
              const card = await db.recurringItems.get(item.autopayChargedToItemId);
              if (card) autopayText = card.name;
            }
            if (!autopayText) autopayText = item.autopayMethod || 'Autopay';
          }
          
          const monthlyCost = getMonthlyCost(item.costEstimate, item.frequency);
          const yearlyCost = monthlyCost * 12;
          
          return {
            ...item,
            linkedCardName,
            autopayText,
            projectedTotal: calculateTotalRemainingProjection(item),
            monthlyCost,
            yearlyCost
          };
        })
      );

      return enhanced;
    },
    []
  );

  const totalMonthly = projectedItems ? projectedItems.reduce((sum, item) => sum + item.monthlyCost, 0) : 0;
  const totalYearly = projectedItems ? projectedItems.reduce((sum, item) => sum + item.yearlyCost, 0) : 0;

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
          <p className="text-sm">No fixed obligations found.</p>
        </div>
      ) : (
        <div className="divide-y divide-space-700/50">
          {projectedItems.map(item => (
            <div key={item.id} className="p-4 md:p-5 hover:bg-space-700/30 transition-colors flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-gray-100">{item.name}</h3>
                <div className="flex items-center text-xs mt-1.5 space-x-3">
                  <div className={`flex items-center font-medium px-2 py-0.5 rounded border ${item.endDate ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-aqua-400 bg-aqua-500/10 border-aqua-500/20'}`}>
                    {item.endDate ? `Ends ${format(parseISO(item.endDate), 'MMM yyyy')}` : `Ongoing`}
                  </div>
                  {item.linkedCardName && !item.isAutopay && (
                    <div className="flex items-center text-gray-400">
                      <CreditCard size={12} className="mr-1" />
                      {item.linkedCardName}
                    </div>
                  )}
                  {item.isAutopay && (
                    <div className="flex items-center text-aqua-400 bg-aqua-500/10 px-1.5 py-0.5 rounded border border-aqua-500/20 uppercase tracking-wider">
                      <Zap size={10} className="mr-1 fill-current" /> Auto: {item.autopayText}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-0.5 uppercase tracking-widest text-[10px] font-bold">
                  {item.endDate ? 'Total Remaining' : 'Next Cycle'}
                </div>
                <div className="text-base font-bold text-gray-200">
                  <span className="text-gray-500 font-normal mr-1 text-sm">₱</span>
                  {item.projectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                
                <div className="mt-1.5 text-xs text-gray-400 text-right space-y-1">
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] tracking-wider mr-1">Mo:</span> 
                    <span className="font-medium text-gray-300">₱{item.monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] tracking-wider mr-1">Yr:</span> 
                    <span className="font-medium text-gray-300">₱{item.yearlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="p-4 md:p-5 bg-space-800/60 border-t border-space-700/50 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Grand Total</h3>
            </div>
            <div className="text-right flex items-center space-x-6">
              <div className="text-xs">
                <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-0.5">Total / Month</div>
                <div className="font-bold text-aqua-400 text-sm">₱{totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="text-xs">
                <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-0.5">Total / Year</div>
                <div className="font-bold text-purple-400 text-base">₱{totalYearly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
