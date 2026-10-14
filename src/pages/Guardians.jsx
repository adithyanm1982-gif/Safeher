import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUp, Info, Pencil, PhoneCall, Plus, Trash2 } from 'lucide-react';
import { Btn, Card, Field, Sheet, Toggle } from '../components/ui/Primitives';
import { useApp } from '../context/AppContext';
import { useSafety } from '../context/SafetyContext';
import { DEFAULT_TEMPLATE } from '../services/sms';
import { checkAlertServer } from '../services/alert';

const blank = { id: '', name: '', phone: '', whatsapp: '', template: DEFAULT_TEMPLATE };
const PHONE_RE = /^\+?[\d\s\-()]{6,20}$/;

export default function Guardians() {
  const { guardians, saveGuardians, emergencyContact, saveEmergencyContact, t } = useApp();
  const { online } = useSafety();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [ecForm, setEcForm] = useState(null);
  const [ecError, setEcError] = useState('');
  const [serverOk, setServerOk] = useState(null);

  useEffect(() => {
    if (!online) return;
    checkAlertServer().then(setServerOk);
  }, [online]);

  const open = (g) => { setError(''); setForm(g ? { ...g } : { ...blank }); };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return setError(`${t('name')} / ${t('phone')} ${t('required')}`);
    if (!PHONE_RE.test(form.phone)) return setError(t('invalidPhone'));
    const next = form.id
      ? guardians.map((g) => (g.id === form.id ? form : g))
      : [...guardians, { ...form, id: `${Date.now()}` }];
    if (next.length > 5) return setError(t('guardianLimit'));
    await saveGuardians(next);
    setForm(null);
  };

  const remove = (id) => saveGuardians(guardians.filter((g) => g.id !== id));
  const promote = (i) => {
    if (i === 0) return;
    const copy = [...guardians];
    [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
    saveGuardians(copy);
  };

  const openEc = () => { setEcError(''); setEcForm({ ...emergencyContact }); };
  const saveEc = async () => {
    const phone = ecForm.phone.trim();
    if (phone && !PHONE_RE.test(phone)) return setEcError(t('invalidPhone'));
    await saveEmergencyContact({ ...ecForm, phone, name: ecForm.name.trim() });
    setEcForm(null);
  };
  const resetEc = async () => {
    await saveEmergencyContact({ name: '', phone: '', autoCall: true });
    setEcForm(null);
  };

  const hasCustom = Boolean(emergencyContact.phone);

  return (
    <div className="space-y-4">
      {serverOk === false && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-500 p-3 text-xs font-semibold text-black">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{t('serverNotSet')}</span>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t('defaultContact')}</h2>
        <Card className="border-accent/50 bg-accent/5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-onaccent"><PhoneCall size={20} /></span>
            <div className="min-w-0 flex-1">
              {hasCustom ? (
                <>
                  <p className="truncate font-semibold">{emergencyContact.name || emergencyContact.phone}</p>
                  <p className="truncate text-xs text-muted">{emergencyContact.phone}</p>
                  <p className="mt-1 text-xs">{emergencyContact.autoCall ? t('getsSmsCall') : t('getsSmsOnly')}</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">{t('emergencyServices')}</p>
                  <p className="mt-1 text-xs text-muted">{t('hint112')}</p>
                </>
              )}
            </div>
            <Btn variant="ghost" className="shrink-0 !px-3" onClick={openEc}><Pencil size={16} /> {t('edit')}</Btn>
          </div>
        </Card>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('guardians')} ({guardians.length}/5)</h2>
          <Btn disabled={guardians.length >= 5} onClick={() => open(null)}><Plus size={18} /> {t('add')}</Btn>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          {t('guardiansHelp')}
        </p>

        {guardians.length === 0 && <Card className="text-sm text-muted">{t('guardiansEmpty')}</Card>}

        {guardians.map((g, i) => (
          <Card key={g.id} className="flex items-center gap-2 !p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-onaccent">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{g.name}</p>
              <p className="truncate text-xs text-muted">{g.phone}{g.whatsapp ? ` · WA ${g.whatsapp}` : ''}</p>
            </div>
            <button type="button" aria-label={t('moveUp')} disabled={i === 0} className="grid min-h-touch min-w-touch place-items-center disabled:opacity-25" onClick={() => promote(i)}><ArrowUp size={18} /></button>
            <button type="button" aria-label={t('edit')} className="grid min-h-touch min-w-touch place-items-center" onClick={() => open(g)}><Pencil size={18} /></button>
            <button type="button" aria-label={t('delete')} className="grid min-h-touch min-w-touch place-items-center text-red-500" onClick={() => remove(g.id)}><Trash2 size={18} /></button>
          </Card>
        ))}
      </section>

      <Sheet open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? t('edit') : t('add')}>
        {form && (
          <div className="space-y-3">
            <Field label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Field label={t('phone')} type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <p className="-mt-2 text-[11px] text-muted">{t('phoneHelp')}</p>
            <Field label={t('whatsapp')} type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <Field label={`${t('template')}  ({name} {lat} {lng} {maps} {time})`} multiline value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} />
            <p className="-mt-2 text-[11px] text-muted">{t('templateHelp')}</p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Btn className="w-full" onClick={save}>{t('save')}</Btn>
          </div>
        )}
      </Sheet>

      <Sheet open={Boolean(ecForm)} onClose={() => setEcForm(null)} title={t('defaultContact')}>
        {ecForm && (
          <div className="space-y-3">
            <p className="text-xs text-muted">{t('defaultIntro')}</p>
            <Field label={t('name')} value={ecForm.name} onChange={(e) => setEcForm({ ...ecForm, name: e.target.value })} />
            <Field label={t('phone')} type="tel" placeholder="+91 98765 43210" value={ecForm.phone} onChange={(e) => setEcForm({ ...ecForm, phone: e.target.value })} />
            <Toggle label={t('callAuto')} hint={t('callAutoHint')} checked={ecForm.autoCall} onChange={(v) => setEcForm({ ...ecForm, autoCall: v })} />
            {ecError && <p className="text-xs text-red-500">{ecError}</p>}
            <Btn className="w-full" onClick={saveEc}>{t('save')}</Btn>
            {hasCustom && <Btn variant="ghost" className="w-full" onClick={resetEc}>{t('use112Only')}</Btn>}
          </div>
        )}
      </Sheet>
    </div>
  );
}