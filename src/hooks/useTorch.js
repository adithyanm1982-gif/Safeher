import { useCallback, useEffect, useRef, useState } from 'react';

export default function useTorch() {
  const [on, setOn] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

  const release = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setOn(false);
  }, []);

  const enable = useCallback(async () => {
    try {
      const md = navigator.mediaDevices;
      if (!md || !md.getUserMedia) throw new Error('Camera unsupported');
      const stream = await md.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      if (!caps.torch) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('Torch not supported on this device');
      }
      await track.applyConstraints({ advanced: [{ torch: true }] });
      streamRef.current = stream;
      setOn(true);
      setError(null);
      return true;
    } catch (err) {
      setError(err?.name === 'NotAllowedError' ? 'Camera permission denied' : err?.message || 'Torch failed');
      return false;
    }
  }, []);

  const toggle = useCallback(() => (on ? release() : enable()), [on, release, enable]);

  useEffect(() => release, [release]);

  return { on, error, enable, release, toggle };
}
