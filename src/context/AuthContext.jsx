import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSecure, setSecure } from '../services/db';
import { randomSalt, sha256 } from '../services/crypto';

const AuthContext = createContext(null);

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let alive = true;
    getSecure('auth', null).then((a) => {
      if (!alive) return;
      setAuth(a);
      setLocked(Boolean(a && (a.pinHash || a.patternHash)));
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setAuth(next);
    await setSecure('auth', next);
  }, []);

  const hasPin = Boolean(auth?.pinHash);
  const hasPattern = Boolean(auth?.patternHash);
  const hasBiometric = Boolean(auth?.credId);

  const setupPin = useCallback(
    async (pin) => {
      const salt = auth?.salt || randomSalt();
      await persist({ ...(auth || {}), salt, pinHash: await sha256(salt + ':pin:' + pin) });
    },
    [auth, persist]
  );

  const setupPattern = useCallback(
    async (seq) => {
      const salt = auth?.salt || randomSalt();
      await persist({ ...(auth || {}), salt, patternHash: await sha256(salt + ':pat:' + seq.join('-')) });
    },
    [auth, persist]
  );

  const verifyPin = useCallback(
    async (pin) => {
      if (!auth?.pinHash) return false;
      return (await sha256(auth.salt + ':pin:' + pin)) === auth.pinHash;
    },
    [auth]
  );

  const verifyPattern = useCallback(
    async (seq) => {
      if (!auth?.patternHash) return false;
      return (await sha256(auth.salt + ':pat:' + seq.join('-'))) === auth.patternHash;
    },
    [auth]
  );

  const unlockWithPin = useCallback(
    async (pin) => {
      const ok = await verifyPin(pin);
      if (ok) setLocked(false);
      return ok;
    },
    [verifyPin]
  );

  const unlockWithPattern = useCallback(
    async (seq) => {
      const ok = await verifyPattern(seq);
      if (ok) setLocked(false);
      return ok;
    },
    [verifyPattern]
  );

  const registerBiometric = useCallback(async () => {
    if (!window.PublicKeyCredential || !navigator.credentials) throw new Error('Biometrics not supported');
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
    if (available === false) throw new Error('No biometric authenticator available');
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'SafeHer' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'safeher-user', displayName: 'SafeHer User' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000
      }
    });
    if (!cred) throw new Error('Biometric registration cancelled');
    await persist({ ...(auth || {}), salt: auth?.salt || randomSalt(), credId: toB64(cred.rawId) });
  }, [auth, persist]);

  const unlockWithBiometric = useCallback(async () => {
    if (!auth?.credId) return false;
    try {
      const res = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: 'public-key', id: fromB64(auth.credId), transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000
        }
      });
      if (res) {
        setLocked(false);
        return true;
      }
    } catch {
      /* cancelled or failed */
    }
    return false;
  }, [auth]);

  const clearAuth = useCallback(async () => {
    await persist(null);
    setLocked(false);
  }, [persist]);

  const lock = useCallback(() => {
    if (auth && (auth.pinHash || auth.patternHash)) setLocked(true);
  }, [auth]);

  const value = useMemo(
    () => ({
      ready, locked, hasPin, hasPattern, hasBiometric,
      setupPin, setupPattern, verifyPin, verifyPattern,
      unlockWithPin, unlockWithPattern, registerBiometric, unlockWithBiometric, clearAuth, lock
    }),
    [ready, locked, hasPin, hasPattern, hasBiometric, setupPin, setupPattern, verifyPin, verifyPattern,
      unlockWithPin, unlockWithPattern, registerBiometric, unlockWithBiometric, clearAuth, lock]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
