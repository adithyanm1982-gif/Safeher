import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './AppContext';
import useGeolocation from '../hooks/useGeolocation';
import useOnlineStatus from '../hooks/useOnlineStatus';
import useRecorder from '../hooks/useRecorder';
import useShake from '../hooks/useShake';
import useVoiceTrigger from '../hooks/useVoiceTrigger';
import usePowerSequence from '../hooks/usePowerSequence';
import useTorch from '../hooks/useTorch';
import useWakeLock from '../hooks/useWakeLock';
import { Siren } from '../services/siren';
import { buildEmergencyLinks } from '../services/sms';
import { LiveBroadcaster, sendOrQueue } from '../services/sync';
import { notify, requestBackgroundSync } from '../services/serviceWorker';
import { sosPulse, vibrate } from '../services/haptics';

const SafetyContext = createContext(null);
const GRACE_SECONDS = 3;

export function SafetyProvider({ children }) {
  const { settings, guardians } = useApp();
  const online = useOnlineStatus();
  const geo = useGeolocation();
  const rec = useRecorder();
  const torch = useTorch();

  const [status, setStatus] = useState('idle');
  const [grace, setGrace] = useState(GRACE_SECONDS);
  const [source, setSource] = useState(null);
  const [silent, setSilent] = useState(false);
  const [emergency, setEmergency] = useState({ links: [], group: null });
  const [sirenOn, setSirenOn] = useState(false);
  const [strobeOn, setStrobeOn] = useState(false);
  const [walkActive, setWalkActive] = useState(false);

  const siren = useRef(new Siren());
  const broadcaster = useRef(new LiveBroadcaster());
  const graceTimer = useRef(null);
  const statusRef = useRef('idle');
  const guardiansRef = useRef(guardians);
  const settingsRef = useRef(settings);
  guardiansRef.current = guardians;
  settingsRef.current = settings;
  statusRef.current = status;

  useWakeLock(status === 'active' || walkActive);

  const startSiren = useCallback(async () => {
    const ok = await siren.current.start();
    setSirenOn(ok);
    return ok;
  }, []);

  const stopSiren = useCallback(() => {
    siren.current.stop();
    setSirenOn(false);
  }, []);

  const toggleSiren = useCallback(() => (siren.current.running ? stopSiren() : startSiren()), [startSiren, stopSiren]);

  const activate = useCallback(
    async (src, quiet) => {
      setStatus('active');
      statusRef.current = 'active';
      setSource(src);
      setSilent(Boolean(quiet));
      sosPulse();
      const cfg = settingsRef.current;

      const pos = await geo.getCurrent();
      const built = buildEmergencyLinks(guardiansRef.current, pos);
      setEmergency(built);

      if (!quiet && cfg.sirenOnSOS) startSiren();
      if (cfg.recordOnSOS) rec.start({ source: src });

      sendOrQueue('incident', { type: 'sos', source: src, pos, ts: Date.now() }).then(requestBackgroundSync);
      broadcaster.current.start(() => ({ ts: Date.now(), pos: geo.posRef.current, source: src }), 10000);

      if (!quiet) notify('SOS active', 'Your guardians are being alerted.');
      if (!quiet && cfg.autoOpenSms && !navigator.onLine && built.group) {
        try {
          window.location.href = built.group;
        } catch {
          /* user can tap the link manually */
        }
      }
    },
    [geo, rec, startSiren]
  );

  const clearGraceTimer = () => {
    clearInterval(graceTimer.current);
    graceTimer.current = null;
  };

  const trigger = useCallback(
    (src = 'manual', opts = {}) => {
      if (statusRef.current !== 'idle') return;
      const quiet = Boolean(opts.silent);
      setSource(src);
      setSilent(quiet);
      if (opts.immediate) {
        activate(src, quiet);
        return;
      }
      setStatus('countdown');
      statusRef.current = 'countdown';
      setGrace(GRACE_SECONDS);
      let left = GRACE_SECONDS;
      graceTimer.current = setInterval(() => {
        left -= 1;
        if (!quiet) vibrate(60);
        setGrace(left);
        if (left <= 0) {
          clearGraceTimer();
          activate(src, quiet);
        }
      }, 1000);
    },
    [activate]
  );

  const cancel = useCallback(() => {
    clearGraceTimer();
    setStatus('idle');
    statusRef.current = 'idle';
    setSource(null);
    setSilent(false);
  }, []);

  const resolve = useCallback(() => {
    clearGraceTimer();
    broadcaster.current.stop();
    stopSiren();
    rec.stop();
    setStrobeOn(false);
    torch.release();
    setStatus('idle');
    statusRef.current = 'idle';
    setSource(null);
    setSilent(false);
    setEmergency({ links: [], group: null });
  }, [rec, stopSiren, torch]);

  useEffect(() => {
    if (status !== 'active') return;
    setEmergency(buildEmergencyLinks(guardiansRef.current, geo.pos));
  }, [status, geo.pos]);

  useEffect(() => () => {
    clearGraceTimer();
    broadcaster.current.stop();
    siren.current.stop();
  }, []);

  const covert = useCallback((src) => trigger(src, { silent: true }), [trigger]);
  const visible = useCallback((src) => trigger(src), [trigger]);

  useShake({
    enabled: settings.shakeEnabled,
    sensitivity: settings.shakeSensitivity,
    onShake: settings.stealthMode ? covert : visible
  });
  const voice = useVoiceTrigger({
    enabled: settings.voiceEnabled,
    phrases: settings.phrases,
    lang: { en: 'en-US', es: 'es-ES', hi: 'hi-IN', fr: 'fr-FR' }[settings.lang] || 'en-US',
    onMatch: settings.stealthMode ? covert : visible
  });
  usePowerSequence({ enabled: settings.powerEnabled, onTrigger: settings.stealthMode ? covert : visible });

  const activeSensors = [];
  if (geo.signal > 0) activeSensors.push('GPS');
  if (voice.listening) activeSensors.push('MIC');
  if (settings.shakeEnabled) activeSensors.push('SHAKE');
  if (rec.recording) activeSensors.push('REC');

  const value = useMemo(
    () => ({
      online, geo, rec, torch, voice,
      status, grace, source, silent, emergency,
      trigger, cancel, resolve,
      sirenOn, toggleSiren, startSiren, stopSiren,
      strobeOn, setStrobeOn,
      walkActive, setWalkActive,
      activeSensors
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [online, geo, rec, torch, voice, status, grace, source, silent, emergency, trigger, cancel, resolve,
      sirenOn, toggleSiren, startSiren, stopSiren, strobeOn, walkActive, activeSensors.join(',')]
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

export function useSafety() {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error('useSafety must be used inside SafetyProvider');
  return ctx;
}
