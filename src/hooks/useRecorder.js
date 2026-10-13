import { useCallback, useRef, useState } from 'react';
import { addMedia } from '../services/db';

function pickMime(hasVideo) {
  const options = hasVideo
    ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  if (typeof MediaRecorder === 'undefined') return '';
  return options.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

export default function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState('none');
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const metaRef = useRef({});

  const acquire = async () => {
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) throw new Error('Media devices unsupported');
    try {
      const s = await md.getUserMedia({
        audio: true,
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 15 } }
      });
      return { stream: s, video: true };
    } catch {
      const s = await md.getUserMedia({ audio: true });
      return { stream: s, video: false };
    }
  };

  const stop = useCallback(() => {
    try {
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    } catch {
      /* ignore */
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recRef.current = null;
    setRecording(false);
    setMode('none');
  }, []);

  const start = useCallback(
    async (meta = {}) => {
      if (recRef.current) return true;
      metaRef.current = meta;
      try {
        if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder unsupported');
        const { stream, video } = await acquire();
        streamRef.current = stream;
        const mimeType = pickMime(video);
        const rec = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          audioBitsPerSecond: 32000,
          videoBitsPerSecond: video ? 250000 : undefined
        });
        rec.ondataavailable = async (e) => {
          if (!e.data || !e.data.size) return;
          try {
            await addMedia(e.data, { ...metaRef.current, video });
          } catch (err) {
            setError(err?.message || 'Could not store evidence');
          }
        };
        rec.onerror = () => setError('Recorder error');
        rec.start(8000);
        recRef.current = rec;
        setRecording(true);
        setMode(video ? 'video' : 'audio');
        return true;
      } catch (err) {
        setError(err?.name === 'NotAllowedError' ? 'Camera/microphone permission denied' : err?.message || 'Recording failed');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        return false;
      }
    },
    []
  );

  return { recording, mode, error, start, stop };
}
