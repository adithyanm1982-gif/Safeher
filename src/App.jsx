import { useState } from 'react';
import TopBar from './components/ui/TopBar';
import BottomNav from './components/ui/BottomNav';
import LockScreen from './components/modal/LockScreen';
import SOSOverlay from './components/sos/SOSOverlay';
import Strobe from './components/sos/Strobe';
import Calculator from './components/stealth/Calculator';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import Tools from './pages/Tools';
import Guardians from './pages/Guardians';
import Settings from './pages/Settings';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';

const PAGES = { home: Home, tools: Tools, guardians: Guardians, settings: Settings };

export default function App() {
  const [tab, setTab] = useState('home');
  const { settings } = useApp();
  const { ready, locked } = useAuth();
  const Page = PAGES[tab];

  if (!ready) return null;
  if (locked) return <LockScreen />;

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
      <SOSOverlay />
      <Strobe />
      {settings.stealthMode && <Calculator />}
    </div>
  );
}