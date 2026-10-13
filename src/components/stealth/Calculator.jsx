import { useState } from 'react';
import { useSafety } from '../../context/SafetyContext';
import { useApp } from '../../context/AppContext';
import { tap } from '../../services/haptics';

const KEYS = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
const SECRET = '999=';
const EXIT = '000=';

function evaluate(a, b, op) {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
    default: return b;
  }
}

const fmt = (n) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(12))) : 'Error');

export default function Calculator() {
  const { trigger } = useSafety();
  const { update } = useApp();
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);
  const [seq, setSeq] = useState('');

  const press = (k) => {
    tap();
    const nextSeq = (seq + k).slice(-4);
    setSeq(nextSeq);
    if (nextSeq === SECRET) trigger('stealth', { silent: true, immediate: true });
    if (nextSeq === EXIT) {
      update({ stealthMode: false });
      return;
    }

    if (/\d/.test(k)) {
      setDisplay((d) => (fresh || d === '0' ? k : d.length < 12 ? d + k : d));
      setFresh(false);
    } else if (k === '.') {
      setDisplay((d) => (fresh ? '0.' : d.includes('.') ? d : d + '.'));
      setFresh(false);
    } else if (k === 'C') {
      setDisplay('0'); setAcc(null); setOp(null); setFresh(true);
    } else if (k === '⌫') {
      setDisplay((d) => (d.length > 1 && !fresh ? d.slice(0, -1) : '0'));
    } else if (k === '±') {
      setDisplay((d) => fmt(-parseFloat(d)));
    } else if (k === '%') {
      setDisplay((d) => fmt(parseFloat(d) / 100));
    } else if (k === '=') {
      if (op != null && acc != null) {
        const r = evaluate(acc, parseFloat(display), op);
        setDisplay(fmt(r));
        setAcc(null); setOp(null); setFresh(true);
      }
    } else {
      const cur = parseFloat(display);
      const base = acc != null && op && !fresh ? evaluate(acc, cur, op) : cur;
      setAcc(base);
      setDisplay(fmt(base));
      setOp(k);
      setFresh(true);
    }
  };

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-[60] flex flex-col justify-end bg-black p-3 text-white nosel">
      <div className="mb-2 truncate px-3 text-right text-7xl font-light">{display}</div>
      <div className="grid grid-cols-4 gap-3 pb-3">
        {KEYS.map((k) => {
          const isOp = ['÷', '×', '−', '+', '='].includes(k);
          const isFn = ['C', '±', '%', '⌫'].includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className={`h-20 rounded-full text-3xl active:opacity-70 ${isOp ? 'bg-orange-500' : isFn ? 'bg-zinc-400 text-black' : 'bg-zinc-800'} ${k === '0' ? '' : ''}`}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
