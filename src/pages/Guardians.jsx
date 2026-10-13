import { useState } from 'react';
import { ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Btn, Card, Field, Sheet } from '../components/ui/Primitives';
import { useApp } from '../context/AppContext';
import { DEFAULT_TEMPLATE } from '../services/sms';

const blank = { id: '', name: '', phone: '', whatsapp: '', template: DEFAULT_TEMPLATE };

export default function Guardians() {
  const { guardians, saveGuardians, t } = useApp();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const open = (g) => { setError(''); setForm(g ? { ...g } : { ...blank }); };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return setError(`${t('name')} / ${t('phone')} required`);
    if (!/^\+?[\d\s\-()]{6,20}$/.test(form.phone)) return setError('Invalid phone number');
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('guardians')} ({guardians.length}/5)</h2>
        <Btn disabled={guardians.length >= 5} onClick={() => open(null)}><Plus size={18} /> {t('add')}</Btn>
      </div>
      {guardians.length === 0 && <Card className="text-sm text-muted">Add up to 5 trusted contacts. They receive your SOS with a live map link.</Card>}
      {guardians.map((g, i) => (
        <Card key={g.id} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-bold text-onaccent">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{g.name}</p>
            <p className="truncate text-xs text-muted">{g.phone}{g.whatsapp ? ` · WA ${g.whatsapp}` : ''}</p>
          </div>
          <button type="button" aria-label="Move up" className="grid min-h-touch min-w-touch place-items-center" onClick={() => promote(i)}><ArrowUp size={18} /></button>
          <button type="button" aria-label={t('edit')} className="grid min-h-touch min-w-touch place-items-center" onClick={() => open(g)}><Pencil size={18} /></button>
          <button type="button" aria-label={t('delete')} className="grid min-h-touch min-w-touch place-items-center text-red-500" onClick={() => remove(g.id)}><Trash2 size={18} /></button>
        </Card>
      ))}

      <Sheet open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? t('edit') : t('add')}>
        {form && (
          <div className="space-y-3">
            <Field label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Field label={t('phone')} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Field label={t('whatsapp')} type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <Field label={`${t('template')}  ({name} {lat} {lng} {maps} {time})`} multiline value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Btn className="w-full" onClick={save}>{t('save')}</Btn>
          </div>
        )}
      </Sheet>
    </div>
  );
}
