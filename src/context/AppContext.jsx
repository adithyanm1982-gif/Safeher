import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGS, translate, translateError } from '../services/i18n';
import { getSecure, setSecure } from '../services/db';

const SETTINGS_KEY = 'safeher.settings';

export const DEFAULT_SETTINGS = {
  theme: 'light',
  lang: 'en',
  shakeEnabled: false,
  shakeSensitivity: 5,
  voiceEnabled: false,
  phrases: ['help me now', 'code red'],
  powerEnabled: false,
  sirenOnSOS: true,
  recordOnSOS: true,
  autoOpenSms: true,
  apiBase: '',
  wsUrl: '',
  fakeCallerName: 'Mom',
  fakeCallerNumber: '+1 555 0100',
  walkMinutes: 15,
  stealthMode: false
};

export const EMPTY_PROFILE = {
  fullName: '',
  bloodGroup: '',
  allergies: '',
  medicalNotes: '',
  homeAddress: '',
  workAddress: '',
  homeCoords: null
};

// Empty phone means "use 112" (one-tap button). A phone number means "call this person automatically".
export const EMPTY_EMERGENCY_CONTACT = { name: '', phone: '', autoCall: true };

const AppContext = createContext(null);

function loadSettings() {
  try {
    const s = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    // Languages that were removed (Spanish, French) fall back to English.
    if (!LANGS.some((l) => l.code === s.lang)) s.lang = 'en';
    return s;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);
  const [guardians, setGuardians] = useState([]);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [emergencyContact, setEmergencyContact] = useState(EMPTY_EMERGENCY_CONTACT);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage may be full or blocked */
    }
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.lang;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.theme === 'contrast' ? '#000000' : settings.theme === 'dark' ? '#020617' : '#e11d48');
  }, [settings]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [g, p, ec] = await Promise.all([
        getSecure('guardians', []),
        getSecure('profile', EMPTY_PROFILE),
        getSecure('emergencyContact', EMPTY_EMERGENCY_CONTACT)
      ]);
      if (!alive) return;
      setGuardians(g);
      setProfile({ ...EMPTY_PROFILE, ...p });
      setEmergencyContact({ ...EMPTY_EMERGENCY_CONTACT, ...ec });
      setDataReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);

  const saveGuardians = useCallback(async (list) => {
    const normalized = list.slice(0, 5).map((g, i) => ({ ...g, priority: i + 1 }));
    setGuardians(normalized);
    await setSecure('guardians', normalized);
  }, []);

  const saveProfile = useCallback(async (next) => {
    setProfile(next);
    await setSecure('profile', next);
  }, []);

  const saveEmergencyContact = useCallback(async (next) => {
    const clean = { ...EMPTY_EMERGENCY_CONTACT, ...next };
    setEmergencyContact(clean);
    await setSecure('emergencyContact', clean);
  }, []);

  const t = useCallback((key, vars) => translate(settings.lang, key, vars), [settings.lang]);
  const te = useCallback((msg) => translateError(settings.lang, msg), [settings.lang]);

  const value = useMemo(
    () => ({
      settings, update, guardians, saveGuardians, profile, saveProfile,
      emergencyContact, saveEmergencyContact, dataReady, t, te
    }),
    [settings, update, guardians, saveGuardians, profile, saveProfile, emergencyContact, saveEmergencyContact, dataReady, t, te]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}