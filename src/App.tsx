import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard'
import { PaidSummary } from './components/PaidSummary'
import { Projections } from './components/Projections'
import { BottomNavigation, type TabType } from './components/BottomNavigation'
import { AddItemDrawer } from './components/AddItemDrawer'
import { Activity, Plus, Receipt, Bell, BellOff, Cloud, CloudOff, Loader2, Download, Mic } from 'lucide-react'
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
  const [addDrawerMode, setAddDrawerMode] = useState<'bill' | 'expense' | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');
  const [driveToken, setDriveToken] = useState<string | null>(localStorage.getItem('google_drive_token'));
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('last_sync_time'));
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [spokenAmount, setSpokenAmount] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Try using Chrome.');
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'fil-PH'; // Support Filipino and English better

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = event.results[0][0].transcript;
      let amount = 0;

      // Look for digit-based numbers first
      const digitMatch = transcript.match(/\b\d+(?:\.\d+)?\b/);

      if (digitMatch) {
        amount = parseFloat(digitMatch[0]);
        transcript = transcript.replace(digitMatch[0], '');
      } else {
        // Fallback for common word-based numbers (English & Filipino)
        const wordMap: Record<string, number> = {
          'one hundred': 100, 'isang daan': 100, '1 hundred': 100,
          'two hundred': 200, 'dalawang daan': 200, '2 hundred': 200,
          'three hundred': 300, 'tatlong daan': 300, '3 hundred': 300,
          'four hundred': 400, 'apat na raan': 400, '4 hundred': 400,
          'five hundred': 500, 'limang daan': 500, '5 hundred': 500,
          'one thousand': 1000, 'isang libo': 1000, '1 thousand': 1000,
          'bente': 20, 'twenty': 20, 'trenta': 30, 'thirty': 30,
          'kwarenta': 40, 'forty': 40, 'singkwenta': 50, 'fifty': 50,
          'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };

        for (const [word, value] of Object.entries(wordMap)) {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          if (regex.test(transcript)) {
            amount = value;
            transcript = transcript.replace(regex, '');
            break;
          }
        }
      }

      setSpokenAmount(amount);

      // Clean up currency words and extra spaces
      transcript = transcript.replace(/\b(?:pesos|peso|php|bucks)\b/gi, '').trim();

      setSpokenText(transcript);
      setAddDrawerMode('expense');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

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
              JIN
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
              onClick={() => setAddDrawerMode('expense')}
              className="p-2 bg-space-800 hover:bg-space-700 border border-space-700 hover:border-electra-500/50 text-electra-400 rounded-lg transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              title="Add Expense"
            >
              <Receipt size={18} />
            </button>
            <button
              onClick={() => setAddDrawerMode('bill')}
              className="p-2 bg-space-800 hover:bg-space-700 border border-space-700 hover:border-aqua-500/50 text-aqua-400 rounded-lg transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              title="Add Bill"
            >
              <Plus size={18} />
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

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} onMicClick={startListening} />

      {isListening && (
        <div className="fixed inset-0 z-[60] bg-space-900/90 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-300">
          <div className="text-white text-2xl font-bold mb-8">Listening...</div>
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping"></div>
            <button
              onClick={() => {
                setIsListening(false);
                // Also abort recognition here if possible, but state will clear it
              }}
              className="relative w-24 h-24 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all"
            >
              <Mic size={48} className="text-white animate-pulse" />
            </button>
          </div>
          <p className="mt-8 text-gray-400 text-sm">Speak your expense (e.g., "Lomi Food")</p>
          <button
            onClick={() => setIsListening(false)}
            className="mt-12 text-gray-400 hover:text-white px-6 py-2 border border-space-700 rounded-full"
          >
            Cancel
          </button>
        </div>
      )}

      <AddItemDrawer
        isOpen={addDrawerMode !== null}
        onClose={() => {
          setAddDrawerMode(null);
          setSpokenText('');
          setSpokenAmount(0);
        }}
        mode={addDrawerMode || 'bill'}
        initialName={spokenText}
        initialAmount={spokenAmount}
      />
    </div>
  )
}

export default App
