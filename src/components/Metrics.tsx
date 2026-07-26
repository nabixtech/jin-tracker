import { useState } from 'react';
import { format } from 'date-fns';
import { computeMonthlyOutflow } from '../lib/businessLogic';
import { db } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, Target, Zap } from 'lucide-react';

export function Metrics() {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [outflow, setOutflow] = useState<number>(0);
  
  const pendingItems = useLiveQuery(
    async () => {
      const items = await db.recurringItems
        .where('nextDueDate')
        .belowOrEqual(`${currentMonth}-31`)
        .toArray();
      return items.filter(item => item.status !== 'Paid' && !item.deletedAt);
    },
    [currentMonth]
  );

  useLiveQuery(async () => {
    const flow = await computeMonthlyOutflow(currentMonth);
    setOutflow(flow);
    return flow;
  }, [currentMonth]);

  const pendingAmount = pendingItems?.reduce((sum, item) => sum + Math.max(0, item.remainingBalance ?? item.costEstimate), 0) || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Primary Metric - Outflow */}
      <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group">
        {/* Neon Glow Background */}
        <div className="absolute -inset-1 bg-gradient-to-r from-aqua-500 to-electra-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative z-10">
          <div className="flex items-center text-aqua-400 mb-3">
            <Activity size={16} className="mr-2" />
            <h3 className="font-bold text-xs uppercase tracking-widest text-gray-300">Total Paid</h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-aqua-500 font-medium text-xl mr-1">₱</span>
            <span className="text-3xl font-bold text-white tracking-tight">{outflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-2 font-medium">Total spent • {format(new Date(), 'MMM yyyy')}</p>
        </div>
        
        {/* Decor */}
        <div className="absolute right-4 bottom-4 text-aqua-500/10 group-hover:text-aqua-500/20 transition-colors">
          <Zap size={64} />
        </div>
      </div>

      {/* Secondary Metric - Pending */}
      <div className="bg-space-800 rounded-2xl p-5 border border-space-700 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center text-gray-400 mb-3">
            <Target size={16} className="mr-2" />
            <h3 className="font-bold text-xs uppercase tracking-widest text-gray-400">Upcoming Bills</h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-gray-500 font-medium text-xl mr-1">₱</span>
            <span className="text-3xl font-bold text-gray-200 tracking-tight">{pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-2 font-medium">Estimated remaining</p>
        </div>
      </div>
    </div>
  );
}
