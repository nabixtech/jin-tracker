import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard'
import { PaidSummary } from './components/PaidSummary'
import { Projections } from './components/Projections'
import { BottomNavigation, type TabType } from './components/BottomNavigation'
import { AddItemDrawer } from './components/AddItemDrawer'
import { Activity, Plus, Bell, BellOff, Cloud, CloudOff, Loader2, Download } from 'lucide-react'
import { requestNotificationPermission, checkAndFireNotifications } from './lib/notifications'
import { useGoogleLogin } from '@react-oauth/google';
import { syncToGoogleDrive } from './lib/googleDriveSync';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');
  const [driveToken, setDriveToken] = useState<string | null>(localStorage.getItem('google_drive_token'));
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('last_sync_time'));
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const handleSync = useCallback(async (token: string | null = driveToken) => {
    if (!token) return;
    setIsSyncing(true);
    const success = await syncToGoogleDrive(token);
    if (success) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(now);
      localStorage.setItem('last_sync_time', now);
    } else {
      setDriveToken(null);
      localStorage.removeItem('google_drive_token');
    }
    setIsSyncing(false);
  }, [driveToken]);

  const loginToDrive = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: (tokenResponse) => {
      setDriveToken(tokenResponse.access_token);
      localStorage.setItem('google_drive_token', tokenResponse.access_token);
      handleSync(tokenResponse.access_token);
    },
    onError: (error) => console.error('Login Failed:', error)
  });

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }

    // Check notifications on mount and then every hour if left open
    const runNotifications = async () => {
      await checkAndFireNotifications();
    };

    runNotifications();
    const interval = setInterval(runNotifications, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // Sync on load if we have a token
  useEffect(() => {
    if (driveToken && !isSyncing) {
      handleSync();
    }
  }, []); // Only run once on mount

  // Sync on background/close
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && driveToken) {
        handleSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [driveToken, handleSync]);

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
          
          <div className="flex items-center space-x-3">
            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="p-2 text-aqua-400 bg-space-800 hover:bg-space-700 border border-aqua-500/30 hover:border-aqua-500/80 rounded-lg transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                title="Install App"
              >
                <Download size={18} />
              </button>
            )}
            {notificationStatus === 'default' && (
              <button 
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  if (granted) {
                    setNotificationStatus('granted');
                    await checkAndFireNotifications();
                  } else {
                    setNotificationStatus('denied');
                  }
                }}
                className="p-2 text-gray-400 hover:text-aqua-400 bg-space-800 hover:bg-space-700 border border-space-700 hover:border-aqua-500/50 rounded-lg transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                title="Enable Notifications"
              >
                <Bell size={18} />
              </button>
            )}
            {notificationStatus === 'denied' && (
              <button 
                onClick={() => {
                  alert("Notifications are blocked by your browser.\n\nTo fix this: Click the Lock/Settings icon in your browser's address bar (next to the URL), find 'Notifications', and change it to 'Allow'.");
                }}
                className="p-2 text-red-400 bg-space-800 hover:bg-space-700 border border-red-500/30 hover:border-red-500/80 rounded-lg transition-all shadow-[0_0_10px_rgba(248,113,113,0.2)]"
                title="Notifications Blocked"
              >
                <BellOff size={18} />
              </button>
            )}
            <div className="relative flex group items-center">
              <button 
                onClick={() => driveToken ? handleSync() : loginToDrive()}
                disabled={isSyncing}
                className={`p-2 bg-space-800 border rounded-lg transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)] ${driveToken ? 'text-green-400 border-green-500/30 hover:border-green-500/80 hover:bg-space-700' : 'text-gray-400 border-space-700 hover:border-aqua-500/50 hover:bg-space-700 hover:text-aqua-400'} disabled:opacity-50`}
                title={driveToken ? 'Sync to Google Drive' : 'Login to Google Drive'}
              >
                {isSyncing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : driveToken ? (
                  <Cloud size={18} />
                ) : (
                  <CloudOff size={18} />
                )}
              </button>
              {lastSyncTime && (
                <div className="absolute top-full right-0 mt-1 whitespace-nowrap text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Synced {lastSyncTime}
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsAddDrawerOpen(true)}
              className="flex items-center px-4 py-2 bg-space-800 hover:bg-space-700 border border-space-700 hover:border-aqua-500/50 text-aqua-400 text-sm font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            >
              <Plus size={16} className="mr-1.5" />
              Add Bill
            </button>
          </div>
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
