import { useEffect, useRef, useState } from 'react';

export default function useVoiceTrigger({ enabled, phrases, lang = 'en-US', onMatch }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const cb = useRef(onMatch);
  cb.current = onMatch;
  const key = (phrases || []).join('|');

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!enabled) return undefined;
    if (!SR) {
      setError('Speech recognition not supported in this browser');
      return undefined;
    }
    const list = key.split('|').map((p) => p.trim().toLowerCase()).filter(Boolean);
    let stopped = false;
    let rec = null;
    let restartTimer = null;

    const begin = () => {
      if (stopped) return;
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang;
      rec.onstart = () => {
        setListening(true);
        setError(null);
      };
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript.toLowerCase();
          if (list.some((p) => text.includes(p))) {
            cb.current && cb.current('voice');
            return;
          }
        }
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          stopped = true;
          setError('Microphone permission denied');
        }
      };
      rec.onend = () => {
        setListening(false);
        if (!stopped) restartTimer = setTimeout(begin, 400);
      };
      try {
        rec.start();
      } catch {
        restartTimer = setTimeout(begin, 1500);
      }
    };
    begin();

    return () => {
      stopped = true;
      clearTimeout(restartTimer);
      try {
        rec && rec.abort();
      } catch {
        /* ignore */
      }
      setListening(false);
    };
  }, [enabled, key, lang]);

  return { listening, error };
}
