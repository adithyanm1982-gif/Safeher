export const DEFAULT_TEMPLATE =
  'EMERGENCY! {name}, I need help. My location: {maps} (lat {lat}, lng {lng}) at {time}. Please call me or contact emergency services.';

export function mapsUrl(pos) {
  if (!pos) return '';
  return `https://www.google.com/maps?q=${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`;
}

export function fillTemplate(template, guardian, pos) {
  const tpl = template && template.trim() ? template : DEFAULT_TEMPLATE;
  return tpl
    .replaceAll('{name}', guardian?.name || '')
    .replaceAll('{lat}', pos ? pos.lat.toFixed(6) : 'unknown')
    .replaceAll('{lng}', pos ? pos.lng.toFixed(6) : 'unknown')
    .replaceAll('{maps}', pos ? mapsUrl(pos) : 'location unavailable')
    .replaceAll('{time}', new Date().toLocaleString());
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

const clean = (n) => (n || '').replace(/[^\d+]/g, '');

export function smsLink(number, body) {
  const sep = isIOS() ? '&' : '?';
  return `sms:${clean(number)}${sep}body=${encodeURIComponent(body)}`;
}

export function whatsappLink(number, body) {
  const digits = clean(number).replace('+', '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

export function buildEmergencyLinks(guardians, pos) {
  const sorted = [...guardians].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  const links = sorted.map((g) => {
    const body = fillTemplate(g.template, g, pos);
    return {
      id: g.id,
      name: g.name,
      sms: g.phone ? smsLink(g.phone, body) : null,
      whatsapp: g.whatsapp ? whatsappLink(g.whatsapp, body) : null,
      body
    };
  });
  const numbers = sorted.map((g) => clean(g.phone)).filter(Boolean);
  const groupBody = fillTemplate('', { name: 'everyone' }, pos);
  const group = numbers.length ? `sms:${numbers.join(',')}${isIOS() ? '&' : '?'}body=${encodeURIComponent(groupBody)}` : null;
  return { links, group };
}
