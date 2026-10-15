import { Sheet } from '../ui/Primitives';
import { useApp } from '../../context/AppContext';
import { POLICY, POLICY_CONTACT } from '../../services/policyText';

export default function PrivacyPolicy({ open, onClose }) {
  const { t, settings } = useApp();
  const items = POLICY[settings.lang] || POLICY.en;
  return (
    <Sheet open={open} onClose={onClose} title={t('privacy')}>
      <p className="mb-3 text-xs text-muted">{t('priv_updated')}</p>
      <div className="space-y-4">
        {items.map((i) => (
          <section key={i.h}>
            <h3 className="text-sm font-bold">{i.h}</h3>
            <p className="mt-1 text-sm text-muted">{i.p}</p>
          </section>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Thanks to © OpenStreetMap contributors</p>
      <p className="mt-4 text-xs">
        {t('priv_contact')}{' '}
        <a className="font-semibold text-accent underline" href={`mailto:${POLICY_CONTACT}`}>{POLICY_CONTACT}</a>
      </p>
    </Sheet>
  );
}