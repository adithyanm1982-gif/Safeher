import { useState } from 'react';
import { Fingerprint, KeyRound, Trash2 } from 'lucide-react';
import { Btn, Card, Field, Sheet, Toggle } from '../components/ui/Primitives';
import { PatternPad } from '../components/modal/LockScreen';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSafety } from '../context/SafetyContext';
import { LANGS } from '../services/i18n';
import { requestMotionPermission } from '../hooks/useShake';
import { requestNotificationPermission } from '../services/serviceWorker';
import { wipeEverything } from '../services/db';

export default function Settings() {
  const { settings, update, profile, saveProfile, t } = useApp();
  const auth = useAuth();
  const { rec } = useSafety();
  const [p, setP] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [patternOpen, setPatternOpen] = useState(false);
  const [firstPattern, setFirstPattern] = useState(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [phrases, setPhrases] = useState(settings.phrases.join(', '));

  const savePin = async () => {
    if (!/^\d{4,8}$/.test(pin)) return setNote('PIN must be 4-8 digits');
    await auth.setupPin(pin);
    setPin('');
    setNote('PIN saved');
  };

  const onPattern = async (seq) => {
    if (seq.length < 4) return setNote('Connect at least 4 dots');
    if (!firstPattern) { setFirstPattern(seq); setNote('Draw it again to confirm'); return; }
    if (firstPattern.join() !== seq.join()) { setFirstPattern(null); return setNote('Did not match, start over'); }
    await auth.setupPattern(seq);
    setFirstPattern(null);
    setPatternOpen(false);
    setNote('Pattern saved');
  };

  const bio = async () => {
    try { await auth.registerBiometric(); setNote('Biometric enabled'); } catch (e) { setNote(e.message); }
  };

  const toggleShake = async (v) => {
    if (v && !(await requestMotionPermission())) return setNote('Motion permission denied');
    update({ shakeEnabled: v });
  };

  const doWipe = async () => {
    rec.stop();
    await wipeEverything();
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-2 font-bold">{t('theme')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {[['light', 'light'], ['dark', 'dark'], ['contrast', 'contrast']].map(([id, k]) => (
            <Btn key={id} variant={settings.theme === id ? 'primary' : 'ghost'} onClick={() => update({ theme: id })}>{t(k)}</Btn>
          ))}
        </div>
        <h3 className="mb-2 mt-4 font-bold">{t('language')}</h3>
        <div className="grid grid-cols-4 gap-2">
          {LANGS.map((l) => (
            <Btn key={l.code} variant={settings.lang === l.code ? 'primary' : 'ghost'} onClick={() => update({ lang: l.code })}>{l.label}</Btn>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 font-bold">SOS triggers</h3>
        <Toggle label={t('shake')} checked={settings.shakeEnabled} onChange={toggleShake} />
        {settings.shakeEnabled && (
          <input type="range" min="1" max="10" value={settings.shakeSensitivity} className="w-full accent-[rgb(var(--accent))]"
            onChange={(e) => update({ shakeSensitivity: Number(e.target.value) })} aria-label="Shake sensitivity" />
        )}
        <Toggle label={t('voice')} hint="Listens while the app is open" checked={settings.voiceEnabled} onChange={(v) => update({ voiceEnabled: v })} />
        {settings.voiceEnabled && (
          <Field label="Phrases (comma separated)" value={phrases}
            onChange={(e) => { setPhrases(e.target.value); update({ phrases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }); }} />
        )}
        <Toggle label={t('power')} hint="5 quick volume-key presses or focus changes" checked={settings.powerEnabled} onChange={(v) => update({ powerEnabled: v })} />
        <Toggle label="Siren on SOS" checked={settings.sirenOnSOS} onChange={(v) => update({ sirenOnSOS: v })} />
        <Toggle label="Record evidence on SOS" checked={settings.recordOnSOS} onChange={(v) => update({ recordOnSOS: v })} />
        <Toggle label="Disguise mode: calculator" hint="Type 999= to send a silent SOS, 000= to exit" checked={settings.stealthMode} onChange={(v) => update({ stealthMode: v })} />
        <Btn variant="ghost" className="mt-2 w-full" onClick={requestNotificationPermission}>Enable notifications</Btn>
      </Card>

      <Card>
        <h3 className="mb-2 flex items-center gap-2 font-bold"><KeyRound size={18} /> App lock</h3>
        <div className="flex items-end gap-2">
          <Field className="flex-1" label="PIN (4-8 digits)" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
          <Btn onClick={savePin}>{t('save')}</Btn>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Btn variant="ghost" onClick={() => { setFirstPattern(null); setPatternOpen(true); }}>Pattern</Btn>
          <Btn variant="ghost" onClick={bio}><Fingerprint size={16} /> Biometric</Btn>
        </div>
        {(auth.hasPin || auth.hasPattern || auth.hasBiometric) && (
          <div className="mt-2 flex gap-2">
            <Btn variant="subtle" className="flex-1" onClick={auth.lock}>Lock now</Btn>
            <Btn variant="subtle" className="flex-1" onClick={auth.clearAuth}>Remove lock</Btn>
          </div>
        )}
        {note && <p className="mt-2 text-xs text-muted">{note}</p>}
      </Card>

      <Card>
        <h3 className="mb-2 font-bold">{t('profile')}</h3>
        <div className="space-y-3">
          <Field label={t('name')} value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} />
          <Field label={t('bloodGroup')} value={p.bloodGroup} onChange={(e) => setP({ ...p, bloodGroup: e.target.value })} />
          <Field label={t('allergies')} value={p.allergies} onChange={(e) => setP({ ...p, allergies: e.target.value })} />
          <Field label={t('notes')} multiline value={p.medicalNotes} onChange={(e) => setP({ ...p, medicalNotes: e.target.value })} />
          <Field label={t('home_addr')} value={p.homeAddress} onChange={(e) => setP({ ...p, homeAddress: e.target.value })} />
          <Field label={t('work_addr')} value={p.workAddress} onChange={(e) => setP({ ...p, workAddress: e.target.value })} />
          <Btn className="w-full" onClick={async () => { await saveProfile(p); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
            {saved ? '✓' : t('save')}
          </Btn>
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 font-bold">Cloud sync (optional)</h3>
        <Field label="API base URL" placeholder="https://example.com" value={settings.apiBase} onChange={(e) => update({ apiBase: e.target.value })} />
        <Field className="mt-3" label="WebSocket URL" placeholder="wss://example.com/live" value={settings.wsUrl} onChange={(e) => update({ wsUrl: e.target.value })} />
      </Card>

      <Btn variant="danger" className="w-full !min-h-[56px]" onClick={() => setWipeOpen(true)}>
        <Trash2 size={18} /> {t('wipe')}
      </Btn>

      <Sheet open={patternOpen} onClose={() => setPatternOpen(false)} title="Pattern">
        <p className="mb-3 text-center text-sm text-muted">{note || 'Draw a pattern (4+ dots)'}</p>
        <PatternPad onComplete={onPattern} resetKey={String(Boolean(firstPattern))} />
      </Sheet>

      <Sheet open={wipeOpen} onClose={() => setWipeOpen(false)} title={t('wipe')}>
        <p className="mb-4 text-sm">{t('wipeConfirm')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="ghost" onClick={() => setWipeOpen(false)}>{t('cancel')}</Btn>
          <Btn variant="danger" onClick={doWipe}>{t('delete')}</Btn>
        </div>
      </Sheet>
    </div>
  );
}
