import { useState } from 'react';
import { Dashboard } from './components/Dashboard'
import { PaidSummary } from './components/PaidSummary'
import { Projections } from './components/Projections'
import { BottomNavigation, type TabType } from './components/BottomNavigation'
import { AddItemDrawer } from './components/AddItemDrawer'
import { Activity, Plus } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-space-900 text-gray-100 pb-24 md:pb-28 selection:bg-aqua-500/30">
      {/* Header */}
      <header className="bg-space-900/80 backdrop-blur-xl border-b border-space-800 sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 bg-space-800 border border-space-700 rounded-xl flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:border-aqua-500/50 transition-colors">
              <Activity size={20} className="text-aqua-400 group-hover:animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
              JIN<span className="text-aqua-400">TRACKER</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setIsAddDrawerOpen(true)}
            className="flex items-center px-4 py-2 bg-space-800 hover:bg-space-700 border border-space-700 hover:border-aqua-500/50 text-aqua-400 text-sm font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
          >
            <Plus size={16} className="mr-1.5" />
            Add Bill
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 md:mt-8 space-y-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'history' && <PaidSummary />}
        {activeTab === 'projections' && <Projections />}
      </main>

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <AddItemDrawer 
        isOpen={isAddDrawerOpen} 
        onClose={() => setIsAddDrawerOpen(false)} 
      />
    </div>
  )
}

export default App
