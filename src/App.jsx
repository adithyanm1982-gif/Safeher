import { useEffect, useState } from 'react';
import TopBar from './components/ui/TopBar';
import BottomNav from './components/ui/BottomNav';
import PullToRefresh from './components/ui/PullToRefresh';
import LockScreen from './components/modal/LockScreen';
import InstallGuide from './components/modal/InstallGuide';
import SOSOverlay from './components/sos/SOSOverlay';
import { CheckInPrompt } from './components/sos/CheckIn';
import Strobe from './components/sos/Strobe';
import Calculator from './components/stealth/Calculator';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import Tools from './pages/Tools';
import Guardians from './pages/Guardians';
import Settings from './pages/Settings';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useSafety } from './context/SafetyContext';

const PAGES = { home: Home, tools: Tools, guardians: Guardians, settings: Settings };

export default function App() {
  const [tab, setTab] = useState('home');
  const { settings } = useApp();
  const { ready, locked } = useAuth();
  const { status, walkActive, sirenOn, torch, checkin } = useSafety();
  const Page = PAGES[tab];

  // Lets other screens jump to a tab (and scroll to a section), e.g. Home > "Fill now" > Settings > Medical ID.
  useEffect(() => {
    const go = (e) => {
      const { tab: next, focus } = e.detail || {};
      if (next) setTab(next);
      if (focus) {
        setTimeout(() => document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
      }
    };
    window.addEventListener('safeher:nav', go);
    return () => window.removeEventListener('safeher:nav', go);
  }, []);

  if (!ready) return null;
  if (locked) return <LockScreen />;

  // Never reload while a safety feature is running, and never on the map (dragging the map would trigger it).
  const noRefresh = tab === 'map' || status !== 'idle' || walkActive || sirenOn || torch.on || Boolean(checkin?.askUntil);

  return (
    <div className="mx-auto min-h-full max-w-md">
      <TopBar />
      {tab === 'map' ? (
        <div
          className="fixed inset-x-0 z-10 mx-auto max-w-md"
          style={{ top: 'calc(53px + env(safe-area-inset-top))', bottom: 'calc(57px + env(safe-area-inset-bottom))' }}
        >
          <MapPage />
        </div>
      ) : (
        <main className="px-4 pb-28 pt-4">
          <Page />
        </main>
      )}
      <BottomNav tab={tab} onChange={setTab} />
      <PullToRefresh disabled={noRefresh} />
      <InstallGuide />
      <CheckInPrompt />
      <SOSOverlay />
      <Strobe />
      {settings.stealthMode && <Calculator />}
    </div>
  );
}