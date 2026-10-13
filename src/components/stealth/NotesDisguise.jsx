import { useEffect, useState } from 'react';
import { useSafety } from '../../context/SafetyContext';
import { useApp } from '../../context/AppContext';

const KEY = 'safeher.notes';

// A plain notes pad. Typing the secret word at the end of the note fires a silent SOS;
// typing the exit word restores the real app.
export default function NotesDisguise() {
  const { trigger } = useSafety();
  const { update } = useApp();
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, text);
    } catch {
      /* ignore */
    }
    const tail = text.slice(-6).toLowerCase();
    if (tail === 'sos999') trigger('stealth', { silent: true, immediate: true });
    if (tail === 'exit00') update({ stealthMode: false });
  }, [text, trigger, update]);

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-[60] flex flex-col bg-amber-50 text-neutral-900">
      <div className="border-b border-amber-200 px-4 py-3 text-lg font-semibold">Notes</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start typing…"
        className="flex-1 resize-none bg-transparent p-4 text-base outline-none"
      />
    </div>
  );
}
