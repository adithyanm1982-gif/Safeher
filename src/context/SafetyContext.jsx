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
import { cancelQueuedSOS, collectRecipients, sendSOSAlert } from '../services/alert';
import { notify, requestBackgroundSync } from '../services/serviceWorker';
import { sosPulse, vibrate } from '../services/haptics';
import { speechLang, translate } from '../services/i18n';

const SafetyContext = createContext(null);
const GRACE_SECONDS = 3;
const IDLE_ALERT = { status: 'idle', results: [], call: null };

const WALK_KEY = 'safeher.walk';
const CHECK_KEY = 'safeher.checkin';
const ASK_SECONDS = 60; // time the user has to answer "Are you okay?"
const OVERDUE_MS = 10000; // deadline passed while the app was closed or asleep

const readJSON = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch {
    return null;
  }
};
const writeJSON = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
};

export function SafetyProvider({ children }) {
  const { settings, guardians, profile, emergencyContact, dataReady } = useApp();
  const online = useOnlineStatus();
  const geo = useGeolocation();
  const rec = useRecorder();
  const torch = useTorch();

  const [status, setStatus] = useState('idle');
  const [grace, setGrace] = useState(GRACE_SECONDS);
  const [source, setSource] = useState(null);
  const [silent, setSilent] = useState(false);
  const [emergency, setEmergency] = useState({ links: [], group: null });
  const [alert, setAlert] = useState(IDLE_ALERT);
  const [sirenOn, setSirenOn] = useState(false);
  const [strobeOn, setStrobeOn] = useState(false);

  // Walk timer and check-in. Both are saved so they survive a closed app or restart.
  const [walkEndAt, setWalkEndAtState] = useState(() => readJSON(WALK_KEY)?.endAt || null);
  const [walkLeft, setWalkLeft] = useState(0);
  const [checkin, setCheckinState] = useState(() => readJSON(CHECK_KEY));
  const [askLeft, setAskLeft] = useState(0);

  const siren = useRef(new Siren());
  const broadcaster = useRef(new LiveBroadcaster());
  const graceTimer = useRef(null);
  const statusRef = useRef('idle');
  const guardiansRef = useRef(guardians);
  const settingsRef = useRef(settings);
  const profileRef = useRef(profile);
  const contactRef = useRef(emergencyContact);
  const alertRef = useRef(alert);
  const lastAlert = useRef(null);
  const session = useRef(0);
  const walkRef = useRef(walkEndAt);
  const checkinRef = useRef(checkin);
  const walkBuzzed = useRef(false);
  const lastBuzz = useRef(0);
  const triggerRef = useRef(null);
  guardiansRef.current = guardians;
  settingsRef.current = settings;
  profileRef.current = profile;
  contactRef.current = emergencyContact;
  alertRef.current = alert;
  statusRef.current = status;

  useWakeLock(status === 'active' || Boolean(walkEndAt) || Boolean(checkin));

  const setWalk = useCallback((endAt) => {
    walkRef.current = endAt;
    setWalkEndAtState(endAt);
    writeJSON(WALK_KEY, endAt ? { endAt } : null);
  }, []);

  const setCheck = useCallback((c) => {
    checkinRef.current = c;
    setCheckinState(c);
    writeJSON(CHECK_KEY, c);
  }, []);

  const startWalk = useCallback(
    (minutes) => {
      walkBuzzed.current = false;
      setWalkLeft(minutes * 60);
      setWalk(Date.now() + minutes * 60000);
    },
    [setWalk]
  );

  const endWalk = useCallback(() => {
    setWalk(null);
    setWalkLeft(0);
  }, [setWalk]);

  const startCheckin = useCallback(
    (every) => setCheck({ every, nextAt: Date.now() + every * 60000, askUntil: null }),
    [setCheck]
  );

  const stopCheckin = useCallback(() => {
    setCheck(null);
    setAskLeft(0);
  }, [setCheck]);

  const answerCheckin = useCallback(() => {
    const c = checkinRef.current;
    if (!c) return;
    setCheck({ ...c, askUntil: null, nextAt: Date.now() + c.every * 60000 });
    setAskLeft(0);
  }, [setCheck]);

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

  // Sends the automatic SMS to every contact and the automatic call to the default contact.
  const dispatchAlert = useCallback(async (src, pos) => {
    const mySession = ++session.current;
    const ec = contactRef.current;
    const recipients = collectRecipients(guardiansRef.current, ec);
    if (!recipients.length) {
      lastAlert.current = null;
      setAlert({ status: 'no-contacts', results: [], call: null });
      return;
    }
    const name = profileRef.current.fullName || '';
    lastAlert.current = { recipients, name };
    setAlert({ status: 'sending', results: [], call: null });

    const out = await sendSOSAlert({
      kind: 'sos',
      name,
      recipients,
      callTo: ec.autoCall && ec.phone ? { name: ec.name, phone: ec.phone } : null,
      pos: pos ? { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, cached: Boolean(pos.cached) } : null,
      source: src,
      ts: Date.now()
    });

    if (session.current !== mySession) {
      // The user pressed "I'm safe" while the alert was still being sent.
      if (out.status === 'sent' || out.status === 'partial') {
        sendSOSAlert({ kind: 'safe', name, recipients, ts: Date.now() });
      }
      return;
    }
    setAlert(out);
  }, []);

  const activate = useCallback(
    async (src, quiet) => {
      setStatus('active');
      statusRef.current = 'active';
      setSource(src);
      setSilent(Boolean(quiet));
      sosPulse();
      const cfg = settingsRef.current;

      const pos = await geo.getCurrent();
      const built = buildEmergencyLinks(guardiansRef.current, pos, profileRef.current);
      setEmergency(built);

      dispatchAlert(src, pos);

      if (!quiet && cfg.sirenOnSOS) startSiren();
      if (cfg.recordOnSOS) rec.start({ source: src });

      sendOrQueue('incident', { type: 'sos', source: src, pos, ts: Date.now() }).then(requestBackgroundSync);
      broadcaster.current.start(() => ({ ts: Date.now(), pos: geo.posRef.current, source: src }), 10000);

      if (!quiet) notify(translate(cfg.lang, 'notifTitle'), translate(cfg.lang, 'notifBody'));
      if (!quiet && cfg.autoOpenSms && !navigator.onLine && built.group) {
        try {
          window.location.href = built.group;
        } catch {
          /* user can tap the link manually */
        }
      }
    },
    [geo, rec, startSiren, dispatchAlert]
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
  triggerRef.current = trigger;

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

    // Tell contacts the alarm is over, but only if they actually received the SOS.
    const last = lastAlert.current;
    const delivered = alertRef.current.status === 'sent' || alertRef.current.status === 'partial';
    session.current += 1;
    lastAlert.current = null;
    setAlert(IDLE_ALERT);
    cancelQueuedSOS().then(() => {
      if (last && delivered) {
        sendSOSAlert({ kind: 'safe', name: last.name, recipients: last.recipients, ts: Date.now() });
      }
    });
  }, [rec, stopSiren, torch]);

  // One clock for the walk timer and check-ins. It runs on every tab, not only on Tools.
  useEffect(() => {
    if (!dataReady) return undefined;
    const tick = () => {
      const now = Date.now();

      const w = walkRef.current;
      if (w) {
        const diff = w - now;
        setWalkLeft(Math.max(0, Math.round(diff / 1000)));
        if (diff <= 30000 && diff > 0 && !walkBuzzed.current) {
          walkBuzzed.current = true;
          vibrate([300, 100, 300]);
        }
        if (diff <= 0) {
          setWalk(null);
          // Expired while the app was closed: give the normal 3-second chance to cancel.
          triggerRef.current('walk-timer', { immediate: -diff < OVERDUE_MS });
        }
      }

      const c = checkinRef.current;
      if (c) {
        if (c.askUntil) {
          const left = Math.ceil((c.askUntil - now) / 1000);
          setAskLeft(Math.max(0, left));
          if (left <= 0) {
            if (-left * 1000 > OVERDUE_MS) {
              // Missed while the app was closed: start a fresh answer window instead of alerting.
              setCheck({ ...c, askUntil: now + ASK_SECONDS * 1000 });
            } else {
              setCheck(null);
              triggerRef.current('checkin', { immediate: true });
            }
          } else if (now - lastBuzz.current > 3000) {
            lastBuzz.current = now;
            vibrate([200, 100, 200]);
          }
        } else if (now >= c.nextAt) {
          if (statusRef.current !== 'idle') {
            setCheck({ ...c, nextAt: now + c.every * 60000 });
          } else {
            setCheck({ ...c, askUntil: now + ASK_SECONDS * 1000 });
            setAskLeft(ASK_SECONDS);
            const lang = settingsRef.current.lang;
            notify(translate(lang, 'ci_notifTitle'), translate(lang, 'ci_notifBody'));
          }
        }
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [dataReady, setWalk, setCheck]);

  useEffect(() => {
    if (status !== 'active') return;
    setEmergency(buildEmergencyLinks(guardiansRef.current, geo.pos, profileRef.current));
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
    lang: speechLang(settings.lang),
    onMatch: settings.stealthMode ? covert : visible
  });
  usePowerSequence({ enabled: settings.powerEnabled, onTrigger: settings.stealthMode ? covert : visible });

  const activeSensors = [];
  if (geo.signal > 0) activeSensors.push('GPS');
  if (voice.listening) activeSensors.push('MIC');
  if (settings.shakeEnabled) activeSensors.push('SHAKE');
  if (rec.recording) activeSensors.push('REC');

  const walkActive = Boolean(walkEndAt);

  const value = useMemo(
    () => ({
      online, geo, rec, torch, voice,
      status, grace, source, silent, emergency, alert,
      trigger, cancel, resolve,
      sirenOn, toggleSiren, startSiren, stopSiren,
      strobeOn, setStrobeOn,
      walkActive, walkLeft, startWalk, endWalk,
      checkin, askLeft, startCheckin, stopCheckin, answerCheckin,
      activeSensors
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [online, geo, rec, torch, voice, status, grace, source, silent, emergency, alert, trigger, cancel, resolve,
      sirenOn, toggleSiren, startSiren, stopSiren, strobeOn, walkActive, walkLeft, startWalk, endWalk,
      checkin, askLeft, startCheckin, stopCheckin, answerCheckin, activeSensors.join(',')]
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

export function useSafety() {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error('useSafety must be used inside SafetyProvider');
  return ctx;
}