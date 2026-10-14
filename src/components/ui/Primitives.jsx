import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { tap } from '../../services/haptics';
import { useApp } from '../../context/AppContext';

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

const VARIANTS = {
  primary: 'bg-accent text-onaccent',
  ghost: 'border border-line bg-card text-fg',
  danger: 'bg-red-600 text-white',
  subtle: 'bg-fg/10 text-fg',
  light: 'bg-white text-black'
};

export function Btn({ variant = 'primary', className = '', onClick, children, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        tap();
        onClick && onClick(e);
      }}
      className={`nosel inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        tap();
        onChange(!checked);
      }}
      className="flex min-h-touch w-full items-center justify-between gap-3 py-2 text-left disabled:opacity-40"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-fg/25'}`}>
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full shadow transition-all ${checked ? 'left-[22px] bg-onaccent' : 'left-0.5 bg-white'}`}
        />
      </span>
    </button>
  );
}

export function Field({ label, className = '', multiline, ...rest }) {
  const base =
    'w-full min-h-touch rounded-xl border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent';
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {multiline ? <textarea rows={3} className={base} {...rest} /> : <input className={base} {...rest} />}
    </label>
  );
}

export function Sheet({ open, onClose, title, children }) {
  const { t } = useApp();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="safe-bottom max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{title}</h2>
              <button type="button" aria-label={t('close')} onClick={onClose} className="grid min-h-touch min-w-touch place-items-center">
                <X size={22} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Banner({ tone = 'warn', children }) {
  const tones = {
    warn: 'bg-amber-500 text-black',
    error: 'bg-red-600 text-white',
    info: 'bg-sky-600 text-white'
  };
  return <div className={`px-3 py-2 text-center text-xs font-semibold ${tones[tone]}`}>{children}</div>;
}