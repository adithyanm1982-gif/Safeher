import { useEffect, useState } from 'react';
import { useSafety } from '../../context/SafetyContext';

export default function Strobe() {
  const { strobeOn, setStrobeOn } = useSafety();
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (!strobeOn) return undefined;
    const id = setInterval(() => setFlip((f) => !f), 90);
    return () => clearInterval(id);
  }, [strobeOn]);

  if (!strobeOn) return null;
  return (
    <button
      type="button"
      aria-label="Stop strobe"
      onClick={() => setStrobeOn(false)}
      className="fixed inset-0 z-[80] grid place-items-center"
      style={{ background: flip ? '#ffffff' : '#000000' }}
    >
      <span className="rounded-full px-4 py-2 text-xs font-bold" style={{ background: flip ? '#000' : '#fff', color: flip ? '#fff' : '#000' }}>
        Tap to stop
      </span>
    </button>
  );
}
