import { Home, FileText, TrendingUp } from 'lucide-react';

export type TabType = 'dashboard' | 'history' | 'projections';

interface BottomNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export function BottomNavigation({ activeTab, setActiveTab }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-space-900/90 backdrop-blur-xl border-t border-space-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-safe">
      <div className="max-w-md mx-auto px-6 h-16 md:h-20 flex items-center justify-around">
        
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center w-20 h-full transition-colors ${
            activeTab === 'dashboard' ? 'text-aqua-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Home size={24} className={`mb-1 transition-transform ${activeTab === 'dashboard' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('projections')}
          className={`flex flex-col items-center justify-center w-20 h-full transition-colors ${
            activeTab === 'projections' ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <TrendingUp size={24} className={`mb-1 transition-transform ${activeTab === 'projections' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Forecast</span>
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center w-20 h-full transition-colors ${
            activeTab === 'history' ? 'text-electra-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <FileText size={24} className={`mb-1 transition-transform ${activeTab === 'history' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
        </button>

      </div>
    </div>
  );
}
