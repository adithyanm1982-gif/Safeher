import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Btn, Card } from '../ui/Primitives';
import { useApp } from '../../context/AppContext';
import { useSafety } from '../../context/SafetyContext';

const OPTIONS = [15, 30, 60, 120];
const p2 = (n) => String(n).padStart(2, '0');
const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${p2(m)}:${p2(s % 60)}` : `${p2(m)}:${p2(s % 60)}`;
};

export default function CheckInCard() {
  const { t } = useApp();
  const { checkin, startCheckin, stopCheckin } = useSafety();
  const [every, setEvery] = useState(30);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!checkin) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [checkin]);

  const left = checkin && !checkin.askUntil ? Math.max(0, Math.round((checkin.nextAt - now) / 1000)) : 0;

  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 font-bold"><BellRing size={18} /> {t('ci_title')}</h3>
      <p className="mb-3 text-xs text-muted">{t('ci_desc')}</p>

      {checkin ? (
        <>
          <p className="mb-3 text-center text-sm font-semibold">{t('ci_next', { time: fmt(left) })}</p>
          <Btn variant="danger" className="w-full" onClick={stopCheckin}>{t('ci_stop')}</Btn>
        </>
      ) : (
        <>
          <p className="mb-2 text-xs font-medium text-muted">{t('ci_every')}</p>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {OPTIONS.map((m) => (
              <Btn key={m} variant={every === m ? 'primary' : 'ghost'} className="!px-1 !text-xs" onClick={() => setEvery(m)}>
                {t('ci_min', { n: m })}
              </Btn>
            ))}
          </div>
          <Btn className="w-full" onClick={() => startCheckin(every)}>{t('ci_start')}</Btn>
        </>
      )}
      <p className="mt-2 text-[11px] text-muted">{t('ci_note')}</p>
    </Card>
  );
}

export function CheckInPrompt() {
  const { t } = useApp();
  const { checkin, askLeft, answerCheckin, stopCheckin, trigger, status } = useSafety();
  if (!checkin?.askUntil || status !== 'idle') return null;

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-[65] grid place-items-center bg-amber-500 p-6 text-black">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-black">{t('ci_ask')}</h1>
        <p className="mt-3 text-base font-semibold">{t('ci_askSub')}</p>
        <p className="my-3 text-8xl font-black tabular-nums">{askLeft}</p>
        <Btn variant="light" className="w-full !min-h-[72px] !text-xl" onClick={answerCheckin}>{t('ci_ok')}</Btn>
        <Btn
          variant="danger"
          className="mt-3 w-full !min-h-[56px]"
          onClick={() => {
            stopCheckin();
            trigger('checkin', { immediate: true });
          }}
        >
          {t('ci_help')}
        </Btn>
      </div>
    </div>
  );
}