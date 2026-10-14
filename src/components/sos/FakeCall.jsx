import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, User } from 'lucide-react';
import { Ringtone } from '../../services/siren';
import { vibrate } from '../../services/haptics';
import { useApp } from '../../context/AppContext';
import { speechLang } from '../../services/i18n';

export default function FakeCall({ name, number, onClose }) {
  const { t, settings } = useApp();
  const [state, setState] = useState('ringing');
  const [secs, setSecs] = useState(0);
  const ring = useRef(new Ringtone());
  const buzz = useRef(null);
  const endedRef = useRef(false);
  const speakTimer = useRef(null);

  useEffect(() => {
    const r = ring.current;
    endedRef.current = false;
    r.start();
    vibrate([500, 400, 500, 400]);
    buzz.current = setInterval(() => vibrate([500, 400, 500]), 2500);
    return () => {
      endedRef.current = true;
      clearTimeout(speakTimer.current);
      r.stop();
      clearInterval(buzz.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (state !== 'active') return undefined;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  const speak = (i) => {
    if (endedRef.current) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(t(`fakeLine${(i % 4) + 1}`));
      u.lang = speechLang(settings.lang);
      u.rate = 0.95;
      u.onend = () => {
        if (endedRef.current) return;
        clearTimeout(speakTimer.current);
        speakTimer.current = setTimeout(() => speak(i + 1), 4500);
      };
      synth.speak(u);
    } catch {
      /* speech unavailable */
    }
  };

  const answer = () => {
    ring.current.stop();
    clearInterval(buzz.current);
    setState('active');
    speak(0);
  };

  const end = () => {
    endedRef.current = true;
    clearTimeout(speakTimer.current);
    ring.current.stop();
    clearInterval(buzz.current);
    window.speechSynthesis?.cancel();
    setState('ended');
    onClose();
  };

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-[75] flex flex-col items-center justify-between bg-gradient-to-b from-slate-800 to-black p-8 text-white nosel">
      <div className="mt-12 text-center">
        <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-slate-600"><User size={48} /></div>
        <h1 className="text-3xl font-semibold">{name}</h1>
        <p className="mt-1 text-slate-300">{number}</p>
        <p className="mt-3 text-slate-400">{state === 'ringing' ? t('incoming') : `${mm}:${ss}`}</p>
      </div>
      <div className="mb-10 flex w-full max-w-xs justify-around">
        <button type="button" aria-label={t('decline')} onClick={end} className="grid h-20 w-20 place-items-center rounded-full bg-red-600">
          <PhoneOff size={32} />
        </button>
        {state === 'ringing' && (
          <button type="button" aria-label={t('answer')} onClick={answer} className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500">
            <Phone size={32} />
          </button>
        )}
      </div>
    </div>
  );
}