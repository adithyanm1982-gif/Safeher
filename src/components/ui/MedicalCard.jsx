import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HeartPulse } from 'lucide-react';
import { Btn } from './Primitives';
import { useApp } from '../../context/AppContext';

const goToProfile = () =>
  window.dispatchEvent(new CustomEvent('safeher:nav', { detail: { tab: 'settings', focus: 'profile-card' } }));

export default function MedicalCard() {
  const { t, profile } = useApp();
  const [open, setOpen] = useState(false);
  const complete = Boolean(profile.fullName.trim() && profile.bloodGroup.trim());

  const row = (label, value) => (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold">{value && value.trim() ? value : t('med_notSet')}</span>
    </div>
  );

  return (
    <div className={`overflow-hidden rounded-2xl border bg-card ${complete ? 'border-line' : 'border-accent'}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left"
      >
        <HeartPulse size={18} className="shrink-0 text-accent" />
        <span className="flex-1 text-sm font-bold">{t('med_title')}</span>
        <span className={`text-xs font-semibold ${complete ? 'text-muted' : 'text-accent'}`}>
          {complete ? profile.bloodGroup : t('med_notSet')}
        </span>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-line px-3 pb-3 pt-3">
              {!complete && (
                <div className="rounded-xl bg-accent/10 p-3">
                  <p className="text-sm font-semibold">{t('med_incomplete')}</p>
                  <p className="mt-1 text-xs text-muted">{t('med_incompleteDesc')}</p>
                  <Btn className="mt-2 w-full" onClick={goToProfile}>{t('med_fill')}</Btn>
                </div>
              )}
              <div className="space-y-1">
                {row(t('name'), profile.fullName)}
                {row(t('bloodGroup'), profile.bloodGroup)}
                {row(t('allergies'), profile.allergies)}
                {profile.medicalNotes.trim() && row(t('notes'), profile.medicalNotes)}
              </div>
              {complete && (
                <button type="button" onClick={goToProfile} className="text-xs font-semibold text-accent">{t('edit')}</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}